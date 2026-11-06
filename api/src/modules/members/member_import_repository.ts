import type { EntityManager } from 'typeorm';

import {
  toPaginated,
  toSkipTake,
  type Paginated,
  type PageParams,
} from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type {
  ImportRowResponse,
  ImportRowStatus,
  MemberImportResponse,
  MemberImportStatus,
} from './member_import_types';
import type { MemberScope } from './members_repository';

// Who may see an import: everyone organisation-wide, otherwise only the executive who uploaded it.
export interface ImportViewer {
  organisationId: string;
  uploaderId: string | null;
}

const fullName = (alias: string) =>
  `TRIM(CONCAT(${alias}.first_name, ' ', COALESCE(${alias}.middle_name || ' ', ''), ${alias}.last_name))`;

const IMPORT_SELECT = `
  SELECT i.id,
         i.file_name AS "fileName",
         i.file_size AS "fileSize",
         i.file_type AS "fileType",
         i.status,
         i.failure_reason AS "failureReason",
         i.default_unit_id AS "defaultUnitId",
         du.name AS "defaultUnitName",
         ${fullName('um')} AS "uploadedBy",
         json_build_object(
           'total', i.total_rows, 'valid', i.valid_rows, 'invalid', i.invalid_rows,
           'duplicates', i.duplicate_rows,
           'accepted', i.valid_rows + (SELECT count(*) FROM member_import_rows ar
                                        WHERE ar.import_id = i.id AND ar.status = 'duplicate'
                                          AND ar.resolution IN ('update_existing', 'create_new'))::int,
           'created', i.created_count, 'updated', i.updated_count,
           'skipped', i.skipped_count, 'rejected', i.rejected_count) AS counts,
         i.created_at AS "createdAt",
         i.parsed_at AS "parsedAt",
         i.confirmed_at AS "confirmedAt",
         i.completed_at AS "completedAt",
         i.cancelled_at AS "cancelledAt"
    FROM member_imports i
    LEFT JOIN organisation_units du ON du.id = i.default_unit_id
    LEFT JOIN organisation_executives ue ON ue.id = i.uploaded_by_executive_id
    LEFT JOIN members um ON um.id = ue.member_id`;

const VIEWER_WHERE = `i.organisation_id = $1 AND ($2::uuid IS NULL OR i.uploaded_by_executive_id = $2)`;

// The matched member's details only when the caller reaches their unit.
const ROW_SELECT = `
  SELECT r.id,
         r.row_number AS "rowNumber",
         r.status,
         r.raw_values || jsonb_strip_nulls(jsonb_build_object(
           'phone', r.phone, 'dateOfBirth', to_char(r.date_of_birth, 'YYYY-MM-DD'))) AS "values",
         r.errors,
         CASE WHEN r.duplicate_match IS NULL THEN NULL ELSE json_build_object(
           'matchedOn', r.duplicate_match,
           'memberId', CASE WHEN dm.id IS NOT NULL AND ($2::uuid[] IS NULL OR dms.unit_id = ANY($2::uuid[])) THEN dm.id END,
           'memberName', CASE WHEN dm.id IS NOT NULL AND ($2::uuid[] IS NULL OR dms.unit_id = ANY($2::uuid[])) THEN ${fullName('dm')} END,
           'unitName', CASE WHEN $2::uuid[] IS NULL OR dms.unit_id = ANY($2::uuid[]) THEN dmu.name END,
           'rowNumber', r.duplicate_of_row) END AS duplicate,
         r.resolution,
         r.outcome
    FROM member_import_rows r
    LEFT JOIN members dm ON dm.id = r.duplicate_member_id
    LEFT JOIN memberships dms ON dms.member_id = dm.id AND dms.status = 'active'
    LEFT JOIN organisation_units dmu ON dmu.id = dms.unit_id`;

export interface ExistingMemberMatch {
  id: string;
  memberNumber: string | null;
  phone: string | null;
}

export interface UnitName {
  id: string;
  name: string;
}

export interface ImportForWork {
  id: string;
  organisationId: string;
  status: MemberImportStatus;
  storedPath: string | null;
  fileType: 'csv' | 'xlsx';
  defaultUnitId: string | null;
  uploadedByExecutiveId: string;
  confirmedByExecutiveId: string | null;
}

export const memberImportRepository = {
  async list(viewer: ImportViewer, page: PageParams): Promise<Paginated<MemberImportResponse>> {
    const { skip, take } = toSkipTake(page);
    const params = [viewer.organisationId, viewer.uploaderId];
    const [items, [count]] = await Promise.all([
      dataSource.query(
        `${IMPORT_SELECT} WHERE ${VIEWER_WHERE} ORDER BY i.created_at DESC, i.id DESC LIMIT $3 OFFSET $4`,
        [...params, take, skip],
      ) as Promise<MemberImportResponse[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM member_imports i WHERE ${VIEWER_WHERE}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, page);
  },

  async find(
    viewer: ImportViewer,
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<MemberImportResponse | null> {
    const rows = (await manager.query(`${IMPORT_SELECT} WHERE ${VIEWER_WHERE} AND i.id = $3`, [
      viewer.organisationId,
      viewer.uploaderId,
      id,
    ])) as MemberImportResponse[];
    return rows[0] ?? null;
  },

  // Locks the import so status changes (resolve, confirm, cancel, the worker) queue up.
  async lock(viewer: ImportViewer, id: string, manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT i.id, i.status, i.stored_path AS "storedPath" FROM member_imports i
        WHERE ${VIEWER_WHERE} AND i.id = $3 FOR UPDATE`,
      [viewer.organisationId, viewer.uploaderId, id],
    )) as { id: string; status: MemberImportStatus; storedPath: string | null }[];
    return rows[0] ?? null;
  },

  async forWork(
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<ImportForWork | null> {
    const rows = (await manager.query(
      `SELECT id, organisation_id AS "organisationId", status, stored_path AS "storedPath",
              file_type AS "fileType", default_unit_id AS "defaultUnitId",
              uploaded_by_executive_id AS "uploadedByExecutiveId",
              confirmed_by_executive_id AS "confirmedByExecutiveId"
         FROM member_imports WHERE id = $1`,
      [id],
    )) as ImportForWork[];
    return rows[0] ?? null;
  },

  async listRows(
    importId: string,
    scope: MemberScope,
    filter: ImportRowStatus | undefined,
    page: PageParams,
  ): Promise<Paginated<ImportRowResponse>> {
    const { skip, take } = toSkipTake(page);
    const where = `WHERE r.import_id = $1 AND ($3::member_import_row_status IS NULL OR r.status = $3)`;
    const [items, [count]] = await Promise.all([
      dataSource.query(`${ROW_SELECT} ${where} ORDER BY r.row_number LIMIT $4 OFFSET $5`, [
        importId,
        scope,
        filter ?? null,
        take,
        skip,
      ]) as Promise<ImportRowResponse[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM member_import_rows r
          WHERE r.import_id = $1 AND ($2::member_import_row_status IS NULL OR r.status = $2)`,
        [importId, filter ?? null],
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, page);
  },

  async findRow(importId: string, rowId: string, scope: MemberScope, manager: EntityManager) {
    const rows = (await manager.query(`${ROW_SELECT} WHERE r.import_id = $1 AND r.id = $3`, [
      importId,
      scope,
      rowId,
    ])) as ImportRowResponse[];
    return rows[0] ?? null;
  },

  async existingMatches(
    organisationId: string,
    memberNumbers: string[],
    phones: string[],
  ): Promise<ExistingMemberMatch[]> {
    if (memberNumbers.length === 0 && phones.length === 0) return [];
    return (await dataSource.query(
      `SELECT id, member_number AS "memberNumber", phone FROM members
        WHERE organisation_id = $1 AND (member_number = ANY($2::text[]) OR phone = ANY($3::text[]))
        ORDER BY created_at, id`,
      [organisationId, memberNumbers, phones],
    )) as ExistingMemberMatch[];
  },

  async unitsInReach(organisationId: string, scope: MemberScope): Promise<UnitName[]> {
    return (await dataSource.query(
      `SELECT id, name FROM organisation_units
        WHERE organisation_id = $1 AND status = 'active' AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))`,
      [organisationId, scope],
    )) as UnitName[];
  },

  // Rows a confirm would save that fall outside the caller's reach: a target unit or an existing member.
  async rowsOutsideScope(importId: string, scope: readonly string[], manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT count(*)::int AS total FROM member_import_rows r
         LEFT JOIN memberships ms ON ms.member_id = r.duplicate_member_id AND ms.status = 'active'
        WHERE r.import_id = $1 AND r.outcome IS NULL
          AND (r.status = 'valid' OR r.resolution IN ('update_existing', 'create_new'))
          AND (r.unit_id IS NULL OR NOT r.unit_id = ANY($2::uuid[])
               OR (r.resolution = 'update_existing' AND (ms.unit_id IS NULL OR NOT ms.unit_id = ANY($2::uuid[]))))`,
      [importId, scope],
    )) as { total: number }[];
    return rows[0]?.total ?? 0;
  },
};
