import type { EntityManager } from 'typeorm';

import { toSkipTake, type PageParams } from '../../common/http/pagination';
import { dataSource } from '../../config/database';
import type { ExecutiveStatus } from '../auth';
import { CHAIRMAN_POSITION_ID } from '../organisation';

import type {
  ExecutiveAppointmentResponse,
  ListExecutivesRequest,
  ListUnitsRequest,
  OrganisationOverviewResponse,
  PositionResponse,
  UnitResponse,
} from './chairman_types';

// Read models for the head's screens: lean raw SQL across modules' tables, always filtered to
// the caller's organisation, and to their units unless they are organisation-wide (FR-IAM-03).

export interface ExecutiveRow {
  id: string;
  memberId: string;
  partyId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  lastSignInAt: Date | null;
  createdAt: Date;
  appointments: (Omit<ExecutiveAppointmentResponse, 'effectiveFrom'> & { effectiveFrom: string })[];
}

// What the service needs to decide whether the caller may manage this executive.
export interface ManagedExecutive {
  id: string;
  memberId: string;
  holdsChairman: boolean;
  activeUnitIds: (string | null)[];
}

// null scope = organisation-wide caller, no unit filter.
export type Scope = readonly string[] | null;

const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;

const POSITION_SELECT = `
  SELECT p.id,
         CASE WHEN p.id = '${CHAIRMAN_POSITION_ID}' THEN org.head_title ELSE p.title END AS title,
         CASE WHEN p.id = '${CHAIRMAN_POSITION_ID}' THEN 'organisation' ELSE p.unit_type END AS "unitType",
         p.is_active AS "isActive",
         (p.organisation_id IS NULL) AS "isBuiltIn",
         (SELECT count(*) FROM appointments a
           WHERE a.position_id = p.id AND a.organisation_id = $1 AND a.status = 'active')::int
           AS "holderCount"
     FROM positions p
     LEFT JOIN organisations org ON org.id = $1
   WHERE (p.organisation_id = $1 OR p.organisation_id IS NULL)`;

const EXECUTIVE_SELECT = `
  SELECT e.id, m.id AS "memberId", m.party_id AS "partyId", m.first_name AS "firstName",
         m.middle_name AS "middleName", m.last_name AS "lastName", e.email, m.phone, e.status,
         e.last_sign_in_at AS "lastSignInAt", e.created_at AS "createdAt",
         COALESCE((
           SELECT json_agg(json_build_object(
                     'id', a.id, 'positionId', p.id, 'positionTitle',
                     CASE WHEN p.id = '${CHAIRMAN_POSITION_ID}'
                          THEN (SELECT head_title FROM organisations WHERE id = e.organisation_id)
                          ELSE p.title END,
                    'unitId', u.id, 'unitName', u.name, 'effectiveFrom', a.effective_from,
                    'permissions', COALESCE((SELECT array_agg(g.permission ORDER BY g.permission)
                                               FROM permission_grants g
                                              WHERE g.appointment_id = a.id AND g.revoked_at IS NULL),
                                            '{}'))
                  ORDER BY a.effective_from)
             FROM appointments a
             JOIN positions p ON p.id = a.position_id
             LEFT JOIN organisation_units u ON u.id = a.unit_id
            WHERE a.member_id = e.member_id AND a.status = 'active'), '[]') AS appointments
    FROM organisation_executives e
    JOIN members m ON m.id = e.member_id`;

interface ExecutiveFilters extends Omit<ListExecutivesRequest, 'page' | 'pageSize'> {
  id?: string;
}

function executiveWhere(organisationId: string, scope: Scope, filters: ExecutiveFilters) {
  const params: unknown[] = [organisationId];
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses = ['e.organisation_id = $1'];

  if (scope) {
    clauses.push(`EXISTS (SELECT 1 FROM appointments sa WHERE sa.member_id = e.member_id
                   AND sa.status = 'active' AND sa.unit_id = ANY(${param(scope)}::uuid[]))`);
  }
  if (filters.id) clauses.push(`e.id = ${param(filters.id)}`);
  if (filters.status) clauses.push(`e.status = ${param(filters.status)}`);
  if (filters.search) {
    const p = param(likePattern(filters.search));
    clauses.push(`(m.first_name || ' ' || m.last_name ILIKE ${p} OR e.email ILIKE ${p}
                   OR m.party_id ILIKE ${p})`);
  }
  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
}

function unitWhere(
  organisationId: string,
  scope: Scope,
  filters: Omit<ListUnitsRequest, 'page' | 'pageSize'>,
) {
  const params: unknown[] = [organisationId];
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses = ['u.organisation_id = $1'];

  if (scope) clauses.push(`u.id = ANY(${param(scope)}::uuid[])`);
  if (filters.search) {
    clauses.push(`u.name ILIKE ${param(likePattern(filters.search))}`);
  } else if (filters.parentId) {
    clauses.push(`u.parent_id = ${param(filters.parentId)}`);
  } else if (scope) {
    // Top of the caller's reach: their units whose parent they cannot see.
    clauses.push(`(u.parent_id IS NULL OR NOT u.parent_id = ANY(${param(scope)}::uuid[]))`);
  } else {
    clauses.push('u.parent_id IS NULL');
  }
  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
}

async function paged<T>(select: string, count: string, params: unknown[], page: PageParams) {
  const { skip, take } = toSkipTake(page);
  const n = params.length;
  const [rows, [counted]] = await Promise.all([
    dataSource.query(`${select} LIMIT $${n + 1} OFFSET $${n + 2}`, [
      ...params,
      take,
      skip,
    ]) as Promise<T[]>,
    dataSource.query(count, params) as Promise<{ total: number }[]>,
  ]);
  return { rows, total: counted?.total ?? 0 };
}

export const chairmanRepository = {
  async getOverview(organisationId: string, scope: Scope): Promise<OrganisationOverviewResponse> {
    const executives = executiveWhere(organisationId, scope, {});
    const unitParams: unknown[] = scope ? [organisationId, scope] : [organisationId];
    const unitScope = scope ? 'AND u.id = ANY($2::uuid[])' : '';
    const positionParams = scope ? [organisationId, scope] : [organisationId];
    const positionScope = scope
      ? `AND (p.unit_type = 'organisation' OR EXISTS (
            SELECT 1 FROM organisation_units pu
             WHERE pu.organisation_id = $1 AND pu.type = p.unit_type
               AND pu.id = ANY($2::uuid[])
          ))`
      : '';
    const [[people], unitRows, [counts]] = await Promise.all([
      dataSource.query(
        `SELECT count(*) FILTER (WHERE e.status = 'active')::int AS "activeExecutives",
                count(*) FILTER (WHERE e.status = 'suspended')::int AS "suspendedExecutives"
           FROM organisation_executives e ${executives.sql}`,
        executives.params,
      ) as Promise<
        Pick<OrganisationOverviewResponse, 'activeExecutives' | 'suspendedExecutives'>[]
      >,
      dataSource.query(
        `SELECT u.type, count(*)::int AS count FROM organisation_units u
          WHERE u.organisation_id = $1 ${unitScope} GROUP BY u.type ORDER BY count DESC, u.type`,
        unitParams,
      ) as Promise<{ type: string; count: number }[]>,
      dataSource.query(
        `SELECT (SELECT count(*) FROM positions p
                   WHERE p.organisation_id = $1 AND p.is_active ${positionScope})::int AS positions,
                 (SELECT count(*) FROM members WHERE organisation_id = $1)::int AS members`,
        positionParams,
      ) as Promise<{ positions: number; members: number }[]>,
    ]);

    return {
      members: scope ? null : counts!.members,
      activeExecutives: people!.activeExecutives,
      suspendedExecutives: people!.suspendedExecutives,
      positions: counts!.positions,
      units: unitRows.reduce((sum, row) => sum + row.count, 0),
      unitsByType: unitRows,
    };
  },

  listPositions(organisationId: string): Promise<PositionResponse[]> {
    return dataSource.query(
      `${POSITION_SELECT} ORDER BY (p.organisation_id IS NULL) DESC, p.title`,
      [organisationId],
    ) as Promise<PositionResponse[]>;
  },

  async findPosition(organisationId: string, id: string): Promise<PositionResponse | null> {
    const [row] = (await dataSource.query(`${POSITION_SELECT} AND p.id = $2`, [
      organisationId,
      id,
    ])) as PositionResponse[];
    return row ?? null;
  },

  listUnits(
    organisationId: string,
    scope: Scope,
    filters: Omit<ListUnitsRequest, 'page' | 'pageSize'>,
    page: PageParams,
  ) {
    const where = unitWhere(organisationId, scope, filters);
    return paged<UnitResponse>(
      `SELECT u.id, u.name, u.type, u.parent_id AS "parentId", u.status,
              (SELECT count(*) FROM organisation_units c WHERE c.parent_id = u.id)::int AS "childCount"
         FROM organisation_units u ${where.sql} ORDER BY u.name, u.id`,
      `SELECT count(*)::int AS total FROM organisation_units u ${where.sql}`,
      where.params,
      page,
    );
  },

  async findUnit(organisationId: string, id: string): Promise<UnitResponse | null> {
    const [row] = (await dataSource.query(
      `SELECT u.id, u.name, u.type, u.parent_id AS "parentId", u.status,
              (SELECT count(*) FROM organisation_units c WHERE c.parent_id = u.id)::int AS "childCount"
         FROM organisation_units u WHERE u.organisation_id = $1 AND u.id = $2`,
      [organisationId, id],
    )) as UnitResponse[];
    return row ?? null;
  },

  listExecutives(
    organisationId: string,
    scope: Scope,
    filters: ExecutiveFilters,
    page: PageParams,
  ) {
    const where = executiveWhere(organisationId, scope, filters);
    return paged<ExecutiveRow>(
      `${EXECUTIVE_SELECT} ${where.sql} ORDER BY m.first_name, m.last_name, e.id`,
      `SELECT count(*)::int AS total FROM organisation_executives e
         JOIN members m ON m.id = e.member_id ${where.sql}`,
      where.params,
      page,
    );
  },

  async findExecutive(organisationId: string, scope: Scope, id: string) {
    const where = executiveWhere(organisationId, scope, { id });
    const [row] = (await dataSource.query(
      `${EXECUTIVE_SELECT} ${where.sql}`,
      where.params,
    )) as ExecutiveRow[];
    return row ?? null;
  },

  async findManagedExecutive(
    organisationId: string,
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<ManagedExecutive | null> {
    const [row] = (await manager.query(
      `SELECT e.id, e.member_id AS "memberId",
              EXISTS (SELECT 1 FROM appointments a WHERE a.member_id = e.member_id
                       AND a.status = 'active' AND a.position_id = $3) AS "holdsChairman",
              COALESCE((SELECT array_agg(a.unit_id) FROM appointments a
                         WHERE a.member_id = e.member_id AND a.status = 'active'), '{}')
                AS "activeUnitIds"
         FROM organisation_executives e WHERE e.organisation_id = $1 AND e.id = $2`,
      [organisationId, id, CHAIRMAN_POSITION_ID],
    )) as ManagedExecutive[];
    return row ?? null;
  },

  async holdsAppointment(
    memberId: string,
    positionId: string,
    unitId: string | null,
    manager: EntityManager,
  ) {
    const rows = (await manager.query(
      `SELECT 1 FROM appointments WHERE member_id = $1 AND position_id = $2
          AND unit_id IS NOT DISTINCT FROM $3 AND status = 'active' LIMIT 1`,
      [memberId, positionId, unitId],
    )) as unknown[];
    return rows.length > 0;
  },
};
