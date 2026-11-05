import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Job } from 'bullmq';
import type { EntityManager } from 'typeorm';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../common/errors/app_error';
import type { Paginated, PageParams } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { removeUpload } from '../../common/uploads/image_upload';
import { dataSource } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { getQueue, QUEUE_NAMES } from '../../jobs/queues';
import { AUDIT_ACTIONS } from '../audit';
import type { AccessContext } from '../auth';

import { Member } from './entities/member_entity';
import { MemberImport } from './entities/member_import_entity';
import { MemberImportRow } from './entities/member_import_row_entity';
import { Membership } from './entities/membership_entity';
import { ImportFileError, readSpreadsheet } from './import_file';
import { checkRow, importTemplateCsv, readTable } from './import_rows';
import {
  memberImportRepository as repo,
  type ImportForWork,
  type ImportViewer,
} from './member_import_repository';
import type {
  ImportResolution,
  ImportRowResponse,
  ImportRowStatus,
  ListImportRowsRequest,
  MemberImportFileType,
  MemberImportResponse,
  StartMemberImportRequest,
} from './member_import_types';
import type { MemberScope } from './members_repository';
import { membersRepository } from './members_repository';
import { audit, organisationOf, scopeOf } from './members_service';

const NOT_FOUND = 'Import not found.';
const CONFIRM_BATCH = 500;
const INSERT_CHUNK = 500;

export interface ParseJobData {
  importId: string;
  scope: string[] | null;
}

export interface ConfirmJobData {
  importId: string;
}

export interface UploadedSpreadsheet {
  buffer: Buffer;
  fileName: string;
  fileType: MemberImportFileType;
}

const viewerOf = (auth: AccessContext): ImportViewer => ({
  organisationId: organisationOf(auth),
  uploaderId: auth.organisationWide ? null : auth.accountId,
});

function executiveOf(auth: AccessContext): string {
  if (auth.kind !== 'executive') throw new ForbiddenError('Only executives can import members.');
  return auth.accountId;
}

const storedFile = (stored: string) => path.resolve(env.MEMBER_IMPORT_DIR, stored);

async function findOrFail(viewer: ImportViewer, importId: string, manager?: EntityManager) {
  const found = await repo.find(viewer, importId, manager);
  if (!found) throw new NotFoundError(NOT_FOUND);
  return found;
}

async function failImport(importId: string, reason: string) {
  const rows = (await dataSource.query(
    `UPDATE member_imports SET status = 'failed', failure_reason = $2, updated_at = now()
      WHERE id = $1 AND status = 'processing' RETURNING id`,
    [importId, reason],
  )) as unknown[];
  return rows.length > 0;
}

async function deleteStoredFile(record: { id: string; storedPath: string | null }) {
  if (!record.storedPath) return;
  await removeUpload(storedFile(record.storedPath));
  await dataSource.query(`UPDATE member_imports SET stored_path = NULL WHERE id = $1`, [record.id]);
}

async function ensureConfirmJob(importId: string) {
  const queue = getQueue(QUEUE_NAMES.memberImports);
  const jobId = `confirm-${importId}`;
  const existing = await Job.fromId(queue, jobId);
  if (!existing) await queue.add('confirm', { importId } satisfies ConfirmJobData, { jobId });
  else if (await existing.isFailed()) await existing.retry();
}

// Unit by name within reach (names are only unique among siblings), else the default unit.
function unitResolver(units: { id: string; name: string }[], defaultUnitId: string | null) {
  const byName = new Map<string, string[]>();
  for (const unit of units) {
    const key = unit.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), unit.id]);
  }
  return (name: string | undefined): { unitId: string | null; error?: string } => {
    if (!name) return { unitId: defaultUnitId };
    const matches = byName.get(name.trim().toLowerCase()) ?? [];
    if (matches.length === 1) return { unitId: matches[0]! };
    return {
      unitId: null,
      error:
        matches.length === 0
          ? 'No unit with this name in your reach.'
          : 'More than one unit has this name. Choose a default unit and leave this cell empty.',
    };
  };
}

async function buildRows(record: ImportForWork, table: string[][], scope: MemberScope) {
  const parsed = readTable(table, env.MEMBER_IMPORT_MAX_ROWS);
  const needsUnits = parsed.some((row) => row.values.unit);
  const resolveUnit = unitResolver(
    needsUnits ? await repo.unitsInReach(record.organisationId, scope) : [],
    record.defaultUnitId,
  );

  const checked = parsed.map(({ rowNumber, values }) => {
    const row = checkRow(rowNumber, values);
    const unit = resolveUnit(values.unit);
    if (unit.error) (row.errors.unit ??= []).push(unit.error);
    else if (!unit.unitId && scope) {
      (row.errors.unit ??= []).push(
        'Add a unit: fill in the Unit column or choose a default unit.',
      );
    }
    return { ...row, unitId: unit.unitId };
  });

  const usable = checked.filter((row) => Object.keys(row.errors).length === 0);
  const matches = await repo.existingMatches(
    record.organisationId,
    [...new Set(usable.flatMap((row) => (row.partyId ? [row.partyId] : [])))],
    [...new Set(usable.flatMap((row) => (row.phone ? [row.phone] : [])))],
  );
  const memberByPartyId = new Map<string, string>();
  const memberByPhone = new Map<string, string>();
  for (const match of matches) {
    if (match.partyId && !memberByPartyId.has(match.partyId))
      memberByPartyId.set(match.partyId, match.id);
    if (match.phone && !memberByPhone.has(match.phone)) memberByPhone.set(match.phone, match.id);
  }

  const rowByPartyId = new Map<string, number>();
  const rowByPhone = new Map<string, number>();
  return checked.map((row): Partial<MemberImportRow> => {
    let status: ImportRowStatus = Object.keys(row.errors).length > 0 ? 'invalid' : 'valid';
    let duplicate: Pick<
      MemberImportRow,
      'duplicateMatch' | 'duplicateMemberId' | 'duplicateOfRow'
    > = {
      duplicateMatch: null,
      duplicateMemberId: null,
      duplicateOfRow: null,
    };
    const earlierParty = row.partyId ? rowByPartyId.get(row.partyId) : undefined;
    if (status === 'valid' && earlierParty) {
      status = 'invalid';
      row.errors.partyId = [`This party ID is already on row ${earlierParty}.`];
    } else if (status === 'valid') {
      const byParty = row.partyId ? memberByPartyId.get(row.partyId) : undefined;
      const byPhone = row.phone ? memberByPhone.get(row.phone) : undefined;
      const earlierPhone = row.phone ? rowByPhone.get(row.phone) : undefined;
      if (byParty)
        duplicate = {
          duplicateMatch: 'party_id',
          duplicateMemberId: byParty,
          duplicateOfRow: null,
        };
      else if (byPhone)
        duplicate = { duplicateMatch: 'phone', duplicateMemberId: byPhone, duplicateOfRow: null };
      else if (earlierPhone)
        duplicate = {
          duplicateMatch: 'phone',
          duplicateMemberId: null,
          duplicateOfRow: earlierPhone,
        };
      if (duplicate.duplicateMatch) status = 'duplicate';
      if (row.partyId) rowByPartyId.set(row.partyId, row.rowNumber);
      if (row.phone && !rowByPhone.has(row.phone)) rowByPhone.set(row.phone, row.rowNumber);
    }
    return {
      importId: record.id,
      rowNumber: row.rowNumber,
      rawValues: row.rawValues,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      partyId: row.partyId,
      phone: row.phone,
      dateOfBirth: row.dateOfBirth,
      unitId: status === 'invalid' ? null : row.unitId,
      errors: row.errors,
      status,
      ...duplicate,
    };
  });
}

interface WorkRow {
  id: string;
  status: ImportRowStatus;
  resolution: ImportResolution | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  partyId: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  unitId: string | null;
  duplicateMemberId: string | null;
}

interface RowResult {
  id: string;
  outcome: 'created' | 'updated' | 'skipped' | 'rejected';
  memberId: string | null;
  errors: Record<string, string[]> | null;
}

const PARTY_ID_TAKEN = { partyId: ['A member with this party ID already exists.'] };

async function placeFromImport(
  manager: EntityManager,
  record: ImportForWork,
  memberId: string,
  unitId: string,
) {
  await manager.getRepository(Membership).insert({
    organisationId: record.organisationId,
    memberId,
    unitId,
    source: 'import',
    importId: record.id,
    createdByExecutiveId: record.confirmedByExecutiveId,
  });
}

async function createMembers(manager: EntityManager, record: ImportForWork, rows: WorkRow[]) {
  const partyIds = rows.flatMap((row) => (row.partyId ? [row.partyId] : []));
  const taken = new Set(
    partyIds.length === 0
      ? []
      : (
          (await manager.query(
            `SELECT party_id AS "partyId" FROM members WHERE organisation_id = $1 AND party_id = ANY($2::text[])`,
            [record.organisationId, partyIds],
          )) as { partyId: string }[]
        ).map((row) => row.partyId),
  );
  const results: RowResult[] = [];
  const members: Partial<Member>[] = [];
  const memberships: Partial<Membership>[] = [];
  for (const row of rows) {
    if (row.partyId && taken.has(row.partyId)) {
      results.push({ id: row.id, outcome: 'rejected', memberId: null, errors: PARTY_ID_TAKEN });
      continue;
    }
    const id = randomUUID();
    members.push({
      id,
      organisationId: record.organisationId,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      partyId: row.partyId,
      phone: row.phone,
      dateOfBirth: row.dateOfBirth,
    });
    if (row.unitId) {
      memberships.push({
        organisationId: record.organisationId,
        memberId: id,
        unitId: row.unitId,
        source: 'import',
        importId: record.id,
        createdByExecutiveId: record.confirmedByExecutiveId,
      });
    }
    results.push({ id: row.id, outcome: 'created', memberId: id, errors: null });
  }
  if (members.length > 0) await manager.getRepository(Member).insert(members);
  if (memberships.length > 0) await manager.getRepository(Membership).insert(memberships);
  return results;
}

async function updateMember(
  manager: EntityManager,
  record: ImportForWork,
  row: WorkRow,
): Promise<RowResult> {
  const memberId = row.duplicateMemberId!;
  const current = await membersRepository.lockMember(
    record.organisationId,
    null,
    memberId,
    manager,
  );
  if (!current) {
    return {
      id: row.id,
      outcome: 'rejected',
      memberId: null,
      errors: { _: ['The member no longer exists.'] },
    };
  }
  if (
    row.partyId &&
    row.partyId !== current.partyId &&
    (await membersRepository.partyIdTaken(record.organisationId, row.partyId, memberId, manager))
  ) {
    return { id: row.id, outcome: 'rejected', memberId: null, errors: PARTY_ID_TAKEN };
  }
  // Blank cells leave the member's existing details as they are.
  const changes = Object.fromEntries(
    Object.entries({
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      partyId: row.partyId,
      phone: row.phone,
      dateOfBirth: row.dateOfBirth,
    }).filter(([, value]) => value !== null),
  );
  await manager.getRepository(Member).update({ id: memberId }, changes);
  if (row.unitId && row.unitId !== current.unitId) {
    await manager
      .getRepository(Membership)
      .update({ memberId, status: 'active' }, { status: 'ended', endedAt: new Date() });
    await placeFromImport(manager, record, memberId, row.unitId);
  }
  return { id: row.id, outcome: 'updated', memberId, errors: null };
}

async function applyBatch(manager: EntityManager, record: ImportForWork): Promise<boolean> {
  await manager.query(`SET LOCAL statement_timeout = '120s'`);
  const rows = (await manager.query(
    `SELECT id, status, resolution, first_name AS "firstName", middle_name AS "middleName",
            last_name AS "lastName", party_id AS "partyId", phone,
            to_char(date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth", unit_id AS "unitId",
            duplicate_member_id AS "duplicateMemberId"
       FROM member_import_rows WHERE import_id = $1 AND outcome IS NULL
      ORDER BY row_number LIMIT $2 FOR UPDATE`,
    [record.id, CONFIRM_BATCH],
  )) as WorkRow[];
  if (rows.length === 0) return false;

  const results: RowResult[] = [];
  const toCreate: WorkRow[] = [];
  for (const row of rows) {
    if (row.status === 'invalid') {
      results.push({ id: row.id, outcome: 'rejected', memberId: null, errors: null });
    } else if (row.status === 'valid' || row.resolution === 'create_new') {
      toCreate.push(row);
    } else if (row.resolution === 'update_existing') {
      results.push(await updateMember(manager, record, row));
    } else {
      results.push({ id: row.id, outcome: 'skipped', memberId: null, errors: null });
    }
  }
  results.push(...(await createMembers(manager, record, toCreate)));

  await manager.query(
    `UPDATE member_import_rows r
        SET outcome = v.outcome::member_import_row_outcome, member_id = v.member_id,
            errors = COALESCE(v.errors::jsonb, r.errors), updated_at = now()
       FROM unnest($1::uuid[], $2::text[], $3::uuid[], $4::text[]) AS v(id, outcome, member_id, errors)
      WHERE r.id = v.id`,
    [
      results.map((r) => r.id),
      results.map((r) => r.outcome),
      results.map((r) => r.memberId),
      results.map((r) => (r.errors ? JSON.stringify(r.errors) : null)),
    ],
  );
  return true;
}

async function insertRows(manager: EntityManager, rows: Partial<MemberImportRow>[]) {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    await manager.getRepository(MemberImportRow).insert(rows.slice(start, start + INSERT_CHUNK));
  }
}

export const memberImportService = {
  template(): string {
    return importTemplateCsv();
  },

  list(auth: AccessContext, page: PageParams): Promise<Paginated<MemberImportResponse>> {
    return repo.list(viewerOf(auth), page);
  },

  get(auth: AccessContext, importId: string): Promise<MemberImportResponse> {
    return findOrFail(viewerOf(auth), importId);
  },

  async listRows(
    auth: AccessContext,
    importId: string,
    request: ListImportRowsRequest,
  ): Promise<Paginated<ImportRowResponse>> {
    await findOrFail(viewerOf(auth), importId);
    return repo.listRows(importId, scopeOf(auth), request.filter, request);
  },

  async start(
    auth: AccessContext,
    request: StartMemberImportRequest,
    file: UploadedSpreadsheet,
    context: RequestContext,
  ): Promise<MemberImportResponse> {
    const executiveId = executiveOf(auth);
    const organisationId = organisationOf(auth);
    if (request.defaultUnitId) {
      if (
        !(await membersRepository.unitInOrganisation(
          organisationId,
          request.defaultUnitId,
          dataSource.manager,
        ))
      ) {
        throw new ValidationError({
          defaultUnitId: ['Choose an active unit in your organisation.'],
        });
      }
      if (!auth.organisationWide && !auth.scopeUnitIds.includes(request.defaultUnitId)) {
        throw new ForbiddenError('That unit is outside your assigned scope.');
      }
    }

    const storedPath = `${randomUUID()}.${file.fileType}`;
    await mkdir(path.resolve(env.MEMBER_IMPORT_DIR), { recursive: true });
    await writeFile(storedFile(storedPath), file.buffer, { mode: 0o600 });

    let importId: string;
    try {
      importId = await dataSource.transaction(async (manager) => {
        const { identifiers } = await manager.getRepository(MemberImport).insert({
          organisationId,
          uploadedByExecutiveId: executiveId,
          fileName: file.fileName.slice(0, 255),
          fileSize: file.buffer.length,
          fileType: file.fileType,
          storedPath,
          defaultUnitId: request.defaultUnitId ?? null,
        });
        const id = identifiers[0]!.id as string;
        await audit(
          auth,
          context,
          AUDIT_ACTIONS.memberImportStarted,
          'member_import',
          id,
          manager,
          {
            fileType: file.fileType,
            fileSize: file.buffer.length,
            defaultUnitId: request.defaultUnitId ?? null,
          },
        );
        return id;
      });
    } catch (error) {
      await removeUpload(storedFile(storedPath));
      throw error;
    }

    try {
      await getQueue(QUEUE_NAMES.memberImports).add(
        'parse',
        {
          importId,
          scope: auth.organisationWide ? null : [...auth.scopeUnitIds],
        } satisfies ParseJobData,
        { jobId: `parse-${importId}` },
      );
    } catch (error) {
      logger.error({ err: error, importId }, 'Could not queue a member import.');
      await failImport(importId, 'The import could not be started. Please upload the file again.');
      await deleteStoredFile({ id: importId, storedPath });
      throw new ServiceUnavailableError(
        'Imports are unavailable right now. Please try again shortly.',
      );
    }
    return findOrFail(viewerOf(auth), importId);
  },

  async resolveRow(
    auth: AccessContext,
    importId: string,
    rowId: string,
    resolution: ImportResolution,
  ): Promise<ImportRowResponse> {
    const viewer = viewerOf(auth);
    const scope = scopeOf(auth);
    return dataSource.transaction(async (manager) => {
      const locked = await repo.lock(viewer, importId, manager);
      if (!locked) throw new NotFoundError(NOT_FOUND);
      if (locked.status !== 'ready') {
        throw new ConflictError('Duplicates can only be decided before the import is confirmed.');
      }
      const [row] = (await manager.query(
        `SELECT r.status, r.duplicate_match AS "duplicateMatch", r.duplicate_member_id AS "memberId",
                ms.unit_id AS "memberUnitId"
           FROM member_import_rows r
           LEFT JOIN memberships ms ON ms.member_id = r.duplicate_member_id AND ms.status = 'active'
          WHERE r.import_id = $1 AND r.id = $2`,
        [importId, rowId],
      )) as {
        status: ImportRowStatus;
        duplicateMatch: string | null;
        memberId: string | null;
        memberUnitId: string | null;
      }[];
      if (!row) throw new NotFoundError('Row not found.');
      if (row.status !== 'duplicate') {
        throw new ValidationError({ resolution: ['Only duplicate rows need a decision.'] });
      }
      if (resolution === 'update_existing') {
        if (!row.memberId) {
          throw new ValidationError({
            resolution: [
              'This row repeats another row of the file, so there is no member to update.',
            ],
          });
        }
        if (scope && !(row.memberUnitId && scope.includes(row.memberUnitId))) {
          throw new ForbiddenError('That member is outside your assigned scope.');
        }
      }
      if (resolution === 'create_new' && row.duplicateMatch === 'party_id' && row.memberId) {
        throw new ValidationError({
          resolution: ['Party IDs are unique. Update the existing member or skip this row.'],
        });
      }
      await manager.query(
        `UPDATE member_import_rows SET resolution = $3, updated_at = now() WHERE import_id = $1 AND id = $2`,
        [importId, rowId, resolution],
      );
      return (await repo.findRow(importId, rowId, scope, manager))!;
    });
  },

  async confirm(
    auth: AccessContext,
    importId: string,
    context: RequestContext,
  ): Promise<MemberImportResponse> {
    const executiveId = executiveOf(auth);
    const viewer = viewerOf(auth);
    const status = await dataSource.transaction(async (manager) => {
      const locked = await repo.lock(viewer, importId, manager);
      if (!locked) throw new NotFoundError(NOT_FOUND);
      if (locked.status === 'confirming' || locked.status === 'completed') return locked.status;
      if (locked.status !== 'ready') {
        throw new ConflictError(
          locked.status === 'processing'
            ? 'The file is still being checked. Try again in a moment.'
            : 'This import can no longer be confirmed.',
        );
      }
      if (
        !auth.organisationWide &&
        (await repo.rowsOutsideScope(importId, auth.scopeUnitIds, manager)) > 0
      ) {
        throw new ForbiddenError('Some rows are for units or members outside your assigned scope.');
      }
      await manager.query(
        `UPDATE member_imports SET status = 'confirming', confirmed_at = now(),
                confirmed_by_executive_id = $2, updated_at = now() WHERE id = $1`,
        [importId, executiveId],
      );
      await audit(
        auth,
        context,
        AUDIT_ACTIONS.memberImportConfirmed,
        'member_import',
        importId,
        manager,
      );
      return 'confirming' as const;
    });

    if (status === 'confirming') {
      try {
        await ensureConfirmJob(importId);
      } catch (error) {
        logger.error({ err: error, importId }, 'Could not queue a member import confirmation.');
        throw new ServiceUnavailableError(
          'Saving is delayed. Confirm again in a moment to resume it.',
        );
      }
    }
    return findOrFail(viewer, importId);
  },

  async cancel(
    auth: AccessContext,
    importId: string,
    context: RequestContext,
  ): Promise<MemberImportResponse> {
    const viewer = viewerOf(auth);
    const storedPath = await dataSource.transaction(async (manager) => {
      const locked = await repo.lock(viewer, importId, manager);
      if (!locked) throw new NotFoundError(NOT_FOUND);
      if (locked.status === 'cancelled') return null;
      if (locked.status !== 'processing' && locked.status !== 'ready') {
        throw new ConflictError('This import can no longer be cancelled.');
      }
      await manager.query(
        `UPDATE member_imports SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = $1`,
        [importId],
      );
      await audit(
        auth,
        context,
        AUDIT_ACTIONS.memberImportCancelled,
        'member_import',
        importId,
        manager,
      );
      return locked.storedPath;
    });
    await deleteStoredFile({ id: importId, storedPath });
    return findOrFail(viewer, importId);
  },

  // Worker: reads the file, checks every row and stages them for the preview. Safe to re-run.
  async parse({ importId, scope }: ParseJobData, isLastAttempt: boolean): Promise<void> {
    const record = await repo.forWork(importId);
    if (!record) return;
    if (record.status !== 'processing') {
      await deleteStoredFile(record);
      return;
    }
    try {
      if (!record.storedPath)
        throw new ImportFileError('The uploaded file is no longer available. Upload it again.');
      const file = await readFile(storedFile(record.storedPath)).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') {
            throw new ImportFileError('The uploaded file is no longer available. Upload it again.');
          }
          throw error;
        },
      );
      const rows = await buildRows(record, await readSpreadsheet(file, record.fileType), scope);
      const count = (status: ImportRowStatus) => rows.filter((row) => row.status === status).length;
      await dataSource.transaction(async (manager) => {
        await manager.query(`SET LOCAL statement_timeout = '120s'`);
        const [locked] = (await manager.query(
          `SELECT status FROM member_imports WHERE id = $1 FOR UPDATE`,
          [importId],
        )) as { status: string }[];
        if (locked?.status !== 'processing') return;
        await manager.query(`DELETE FROM member_import_rows WHERE import_id = $1`, [importId]);
        await insertRows(manager, rows);
        await manager.query(
          `UPDATE member_imports SET status = 'ready', parsed_at = now(), updated_at = now(),
                  total_rows = $2, valid_rows = $3, invalid_rows = $4, duplicate_rows = $5
            WHERE id = $1`,
          [importId, rows.length, count('valid'), count('invalid'), count('duplicate')],
        );
      });
    } catch (error) {
      if (error instanceof ImportFileError) await failImport(importId, error.message);
      else if (isLastAttempt)
        await failImport(importId, 'This file could not be processed. Please upload it again.');
      else throw error;
    }
    await deleteStoredFile(record);
  },

  // Worker: saves accepted rows in batches; each batch commits with its row outcomes, so a retry resumes.
  async apply({ importId }: ConfirmJobData): Promise<void> {
    const record = await repo.forWork(importId);
    if (!record || record.status !== 'confirming') return;
    let hasMore = true;
    while (hasMore)
      hasMore = await dataSource.transaction((manager) => applyBatch(manager, record));
    await dataSource.query(
      `UPDATE member_imports i
          SET status = 'completed', completed_at = now(), updated_at = now(),
              created_count = c.created, updated_count = c.updated,
              skipped_count = c.skipped, rejected_count = c.rejected
         FROM (SELECT count(*) FILTER (WHERE outcome = 'created')::int AS created,
                      count(*) FILTER (WHERE outcome = 'updated')::int AS updated,
                      count(*) FILTER (WHERE outcome = 'skipped')::int AS skipped,
                      count(*) FILTER (WHERE outcome = 'rejected')::int AS rejected
                 FROM member_import_rows WHERE import_id = $1) c
        WHERE i.id = $1 AND i.status = 'confirming'`,
      [importId],
    );
  },
};
