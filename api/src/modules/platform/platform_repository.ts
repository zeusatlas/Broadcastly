import type { EntityManager } from 'typeorm';
import { toSkipTake, type PageParams } from '../../common/http/pagination';
import type { DateRange } from '../../common/http/period';
import { dataSource } from '../../config/database';
import type { ExecutiveStatus, PlatformAdminStatus } from '../auth';
import type { BroadcastResponse, BroadcastStatus } from '../broadcasts';
import { CHAIRMAN_POSITION_ID, type OrganisationStatus } from '../organisation';

import type {
  ListOrganisationExecutivesRequest,
  ListOrganisationsRequest,
  ListPlatformAdminsRequest,
  PlatformOverviewResponse,
} from './platform_types';

export interface ExecutiveRow {
  id: string;
  memberId: string;
  memberNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  lastSignInAt: Date | string | null;
  createdAt: Date | string;
  creditBalance: number;
  positions?: string[];
}

export interface OrganisationRow {
  id: string;
  name: string;
  type: string;
  headTitle: string;
  description: string | null;
  status: OrganisationStatus;
  logoPath: string | null;
  creditBalance: number;
  creditReserved: number;
  memberCount: number;
  executiveCount: number;
  createdAt: Date;
  updatedAt: Date;
  head: (ExecutiveRow & { appointmentId: string; appointedAt: string }) | null;
}

export interface PlatformAdminRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: PlatformAdminStatus;
  isSuperAdmin: boolean;
  permissions: string[];
  lastSignInAt: Date | null;
  createdAt: Date;
}

export type OverviewCounts = Omit<
  PlatformOverviewResponse,
  'creditsPurchased' | 'amountPaidPesewas' | 'pendingPurchases' | 'failedPurchases'
>;

export interface BroadcastFilters {
  organisationId?: string;
  status?: BroadcastStatus;
  search?: string;
  range: DateRange;
}

const BROADCAST_SELECT = `
  SELECT b.id, b.organisation_id AS "organisationId", o.name AS "organisationName", b.title,
         b.message, b.status, b.audience_summary AS "audienceSummary",
         b.recipient_count AS "recipientCount", b.segment_count AS "segmentCount",
         b.estimated_credits AS "estimatedCredits", b.delivered_count AS "deliveredCount",
         b.failed_count AS "failedCount", m.first_name || ' ' || m.last_name AS "createdBy",
         b.scheduled_at AS "scheduledAt", b.submitted_at AS "submittedAt",
         b.completed_at AS "completedAt", b.created_at AS "createdAt"
    FROM broadcasts b
    JOIN organisations o ON o.id = b.organisation_id
    LEFT JOIN organisation_executives e ON e.id = b.created_by_executive_id
    LEFT JOIN members m ON m.id = e.member_id`;

type ExecutiveFilters = Omit<ListOrganisationExecutivesRequest, 'page' | 'pageSize'> & {
  id?: string;
};

const EXECUTIVE_COLUMNS = `
  e.id, m.id AS "memberId", m.member_number AS "memberNumber", m.first_name AS "firstName",
  m.middle_name AS "middleName", m.last_name AS "lastName", e.email, m.phone, e.status,
  e.last_sign_in_at AS "lastSignInAt", e.created_at AS "createdAt",
  COALESCE((SELECT w.balance FROM wallets w WHERE w.executive_id = e.id), 0) AS "creditBalance"`;

// $1 = head position id.
const ORGANISATION_SELECT = `
  SELECT o.id, o.name, o.type, o.description, o.head_title AS "headTitle", o.status,
         o.logo_path AS "logoPath",
         COALESCE(w.balance, 0) AS "creditBalance", COALESCE(w.reserved, 0) AS "creditReserved",
         o.created_at AS "createdAt", o.updated_at AS "updatedAt",
         (SELECT count(*) FROM members mm WHERE mm.organisation_id = o.id)::int AS "memberCount",
         (SELECT count(*) FROM organisation_executives ee WHERE ee.organisation_id = o.id)::int
           AS "executiveCount",
          CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) END AS head
    FROM organisations o
    LEFT JOIN LATERAL (SELECT SUM(balance)::int AS balance, SUM(reserved)::int AS reserved
                         FROM wallets WHERE organisation_id = o.id) w ON true
    LEFT JOIN LATERAL (
      SELECT ${EXECUTIVE_COLUMNS}, a.id AS "appointmentId", a.effective_from AS "appointedAt"
        FROM appointments a
        JOIN members m ON m.id = a.member_id
        JOIN organisation_executives e ON e.member_id = a.member_id
       WHERE a.organisation_id = o.id AND a.position_id = $1 AND a.status = 'active'
       LIMIT 1
    ) c ON true`;

// $1 = organisation id. Each executive with the titles of their active positions.
const EXECUTIVE_SELECT = `
  SELECT ${EXECUTIVE_COLUMNS},
         COALESCE((SELECT array_agg(p.title ORDER BY a.effective_from)
                     FROM appointments a JOIN positions p ON p.id = a.position_id
                    WHERE a.member_id = e.member_id AND a.status = 'active'), '{}') AS positions
    FROM organisation_executives e
    JOIN members m ON m.id = e.member_id
   WHERE e.organisation_id = $1`;

const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;

function executiveFilters(organisationId: string, filters: ExecutiveFilters) {
  const params: unknown[] = [organisationId];
  const clauses: string[] = [];
  const param = (value: unknown) => `$${params.push(value)}`;

  if (filters.id) clauses.push(`e.id = ${param(filters.id)}`);
  if (filters.search) {
    const p = param(likePattern(filters.search));
    clauses.push(`(m.first_name || ' ' || m.last_name ILIKE ${p} OR e.email ILIKE ${p}
                   OR m.member_number ILIKE ${p})`);
  }
  if (filters.status) clauses.push(`e.status = ${param(filters.status)}`);

  return { sql: clauses.map((clause) => `AND ${clause}`).join(' '), params };
}

type OrganisationFilters = Omit<ListOrganisationsRequest, 'page' | 'pageSize'>;

// `base` holds parameters the surrounding query already uses, so numbering continues after them.
function organisationWhere(
  { search, status, hasHead: hasHeadFilter, hasChairman }: OrganisationFilters,
  base: unknown[],
) {
  const hasHead = hasHeadFilter ?? hasChairman;
  const params = [...base];
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses: string[] = [];
  if (search) clauses.push(`o.name ILIKE ${param(likePattern(search))}`);
  if (status) clauses.push(`o.status = ${param(status)}`);
  if (hasHead !== undefined) {
    clauses.push(`EXISTS (SELECT 1 FROM appointments a WHERE a.organisation_id = o.id
                   AND a.position_id = ${param(CHAIRMAN_POSITION_ID)} AND a.status = 'active')
                  = ${param(hasHead)}`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

async function paged<T>(
  select: string,
  count: string,
  params: unknown[],
  countParams: unknown[],
  page: PageParams,
) {
  const { skip, take } = toSkipTake(page);
  const n = params.length;
  const [rows, [counted]] = await Promise.all([
    dataSource.query(`${select} LIMIT $${n + 1} OFFSET $${n + 2}`, [
      ...params,
      take,
      skip,
    ]) as Promise<T[]>,
    dataSource.query(count, countParams) as Promise<{ total: number }[]>,
  ]);
  return { rows, total: counted?.total ?? 0 };
}

export const platformRepository = {
  async nameTakenByAnother(name: string, organisationId: string, manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT 1 FROM organisations WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
      [name, organisationId],
    )) as unknown[];
    return rows.length > 0;
  },

  // The organisation's current head appointment, locked so two admins cannot replace them at once.
  async lockActiveHead(organisationId: string, manager: EntityManager) {
    const [row] = (await manager.query(
      `SELECT a.id AS "appointmentId", e.id AS "executiveId"
         FROM appointments a
         JOIN organisation_executives e ON e.member_id = a.member_id AND e.organisation_id = a.organisation_id
        WHERE a.organisation_id = $1 AND a.position_id = $2 AND a.status = 'active'
        FOR UPDATE OF a`,
      [organisationId, CHAIRMAN_POSITION_ID],
    )) as { appointmentId: string; executiveId: string }[];
    return row ?? null;
  },

  async findExecutiveInOrganisation(
    organisationId: string,
    executiveId: string,
    manager: EntityManager,
  ) {
    const [row] = (await manager.query(
      `SELECT id, member_id AS "memberId", status FROM organisation_executives
        WHERE id = $1 AND organisation_id = $2`,
      [executiveId, organisationId],
    )) as { id: string; memberId: string; status: string }[];
    return row ?? null;
  },

  async getOverview(): Promise<OverviewCounts> {
    const [row] = (await dataSource.query(
      `SELECT
         (SELECT count(*) FROM organisations)::int AS "organisations",
         (SELECT count(*) FROM organisations WHERE status = 'suspended')::int
           AS "suspendedOrganisations",
         (SELECT count(*) FROM organisations o WHERE NOT EXISTS (
            SELECT 1 FROM appointments a
             WHERE a.organisation_id = o.id AND a.position_id = $1 AND a.status = 'active'))::int
            AS "organisationsWithoutHead",
         (SELECT count(*) FROM members)::int AS "members",
         (SELECT count(*) FROM appointments a JOIN organisation_executives e ON e.member_id = a.member_id
           WHERE a.position_id = $1 AND a.status = 'active' AND e.status = 'active')::int
            AS "activeHeads",
         (SELECT count(*) FROM organisation_executives WHERE status = 'active')::int AS "activeExecutives",
         (SELECT count(*) FROM organisation_executives WHERE status = 'suspended')::int
           AS "suspendedExecutives",
         (SELECT count(*) FROM platform_admins WHERE status = 'active')::int AS "platformAdmins"`,
      [CHAIRMAN_POSITION_ID],
    )) as OverviewCounts[];

    return row!;
  },

  listOrganisations(filters: OrganisationFilters, page: PageParams) {
    const select = organisationWhere(filters, [CHAIRMAN_POSITION_ID]);
    const count = organisationWhere(filters, []);
    return paged<OrganisationRow>(
      `${ORGANISATION_SELECT} ${select.sql} ORDER BY o.name, o.id`,
      `SELECT count(*)::int AS total FROM organisations o ${count.sql}`,
      select.params,
      count.params,
      page,
    );
  },

  async findOrganisation(id: string): Promise<OrganisationRow | null> {
    const [row] = (await dataSource.query(`${ORGANISATION_SELECT} WHERE o.id = $2`, [
      CHAIRMAN_POSITION_ID,
      id,
    ])) as OrganisationRow[];
    return row ?? null;
  },

  listOrganisationExecutives(organisationId: string, filters: ExecutiveFilters, page: PageParams) {
    const where = executiveFilters(organisationId, filters);
    return paged<ExecutiveRow>(
      `${EXECUTIVE_SELECT} ${where.sql} ORDER BY m.first_name, m.last_name, e.id`,
      `SELECT count(*)::int AS total FROM organisation_executives e
         JOIN members m ON m.id = e.member_id WHERE e.organisation_id = $1 ${where.sql}`,
      where.params,
      where.params,
      page,
    );
  },

  async findOrganisationExecutive(
    organisationId: string,
    id: string,
  ): Promise<ExecutiveRow | null> {
    const where = executiveFilters(organisationId, { id });
    const [row] = (await dataSource.query(
      `${EXECUTIVE_SELECT} ${where.sql}`,
      where.params,
    )) as ExecutiveRow[];
    return row ?? null;
  },

  listBroadcasts({ organisationId, status, search, range }: BroadcastFilters, page: PageParams) {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses: string[] = [];
    if (organisationId) clauses.push(`b.organisation_id = ${param(organisationId)}`);
    if (status) clauses.push(`b.status = ${param(status)}`);
    if (range.from) clauses.push(`b.created_at >= ${param(range.from)}`);
    if (range.to) clauses.push(`b.created_at < ${param(range.to)}`);
    if (search) {
      const p = param(likePattern(search));
      clauses.push(`(b.title ILIKE ${p} OR b.message ILIKE ${p})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return paged<BroadcastResponse>(
      `${BROADCAST_SELECT} ${where} ORDER BY b.created_at DESC, b.id`,
      `SELECT count(*)::int AS total FROM broadcasts b ${where}`,
      params,
      params,
      page,
    );
  },

  listPlatformAdmins(
    { search, status }: Omit<ListPlatformAdminsRequest, 'page' | 'pageSize'>,
    page: PageParams,
  ) {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses: string[] = [];
    if (search) {
      const p = param(likePattern(search));
      clauses.push(`(first_name || ' ' || last_name ILIKE ${p} OR email ILIKE ${p})`);
    }
    if (status) clauses.push(`status = ${param(status)}`);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return paged<PlatformAdminRow>(
      `SELECT id, first_name AS "firstName", last_name AS "lastName", email, phone, status,
              is_super_admin AS "isSuperAdmin", permissions,
              last_sign_in_at AS "lastSignInAt", created_at AS "createdAt"
         FROM platform_admins ${where} ORDER BY is_super_admin DESC, first_name, last_name, id`,
      `SELECT count(*)::int AS total FROM platform_admins ${where}`,
      params,
      params,
      page,
    );
  },
};
