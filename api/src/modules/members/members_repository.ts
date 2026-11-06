import type { EntityManager } from 'typeorm';

import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type { ListMembersRequest, MemberResponse } from './members_types';

// null = organisation-wide (every member); otherwise the unit ids the caller reaches, descendants included.
export type MemberScope = readonly string[] | null;

const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const fullName = (alias: string) =>
  `TRIM(CONCAT(${alias}.first_name, ' ', COALESCE(${alias}.middle_name || ' ', ''), ${alias}.last_name))`;

// to_char keeps date_of_birth a calendar date; the driver would turn it into a timezone-shifted Date.
const MEMBER_SELECT = `
  SELECT m.id,
         m.organisation_id AS "organisationId",
         m.first_name AS "firstName",
         m.middle_name AS "middleName",
         m.last_name AS "lastName",
         ${fullName('m')} AS "fullName",
         m.party_id AS "partyId",
         m.phone,
         to_char(m.date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth",
         ms.unit_id AS "unitId",
         u.name AS "unitName",
         m.status,
         EXISTS (SELECT 1 FROM organisation_executives e WHERE e.member_id = m.id) AS "isExecutive",
         m.created_at AS "createdAt"
    FROM members m
    LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'active'
    LEFT JOIN organisation_units u ON u.id = ms.unit_id`;

function memberWhere(
  organisationId: string,
  scope: MemberScope,
  filters: Partial<ListMembersRequest> = {},
) {
  const params: unknown[] = [organisationId];
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses = ['m.organisation_id = $1'];

  if (scope) clauses.push(`ms.unit_id = ANY(${param(scope)}::uuid[])`);
  if (filters.status) clauses.push(`m.status = ${param(filters.status)}`);
  if (filters.isExecutive !== undefined) {
    clauses.push(
      `${filters.isExecutive ? '' : 'NOT '}EXISTS (SELECT 1 FROM organisation_executives e WHERE e.member_id = m.id)`,
    );
  }
  if (filters.unitId) {
    clauses.push(`ms.unit_id IN (
      WITH RECURSIVE tree AS (
        SELECT id FROM organisation_units WHERE id = ${param(filters.unitId)} AND organisation_id = $1
        UNION ALL
        SELECT c.id FROM organisation_units c JOIN tree t ON c.parent_id = t.id
      ) SELECT id FROM tree)`);
  }
  if (filters.search) {
    const value = param(likePattern(filters.search));
    clauses.push(
      `(${fullName('m')} ILIKE ${value} OR m.party_id ILIKE ${value} OR m.phone ILIKE ${value})`,
    );
  }
  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
}

export const membersRepository = {
  async list(
    organisationId: string,
    scope: MemberScope,
    request: ListMembersRequest,
  ): Promise<Paginated<MemberResponse>> {
    const where = memberWhere(organisationId, scope, request);
    const { skip, take } = toSkipTake(request);
    const n = where.params.length;
    const names =
      request.sort === 'last_name'
        ? 'lower(m.last_name), lower(m.first_name)'
        : 'lower(m.first_name), lower(m.last_name)';
    const order = request.groupBy === 'unit' ? `lower(u.name) NULLS LAST, u.id, ${names}` : names;
    const [items, [count]] = await Promise.all([
      dataSource.query(
        `${MEMBER_SELECT} ${where.sql} ORDER BY ${order}, m.id LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...where.params, take, skip],
      ) as Promise<MemberResponse[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM members m
           LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'active' ${where.sql}`,
        where.params,
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, request);
  },

  async findById(
    organisationId: string,
    scope: MemberScope,
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<MemberResponse | null> {
    const where = memberWhere(organisationId, scope);
    const rows = (await manager.query(
      `${MEMBER_SELECT} ${where.sql} AND m.id = $${where.params.length + 1}`,
      [...where.params, id],
    )) as MemberResponse[];
    return rows[0] ?? null;
  },

  // Locks the member row so concurrent edits and deactivations of one member queue up.
  async lockMember(organisationId: string, scope: MemberScope, id: string, manager: EntityManager) {
    const where = memberWhere(organisationId, scope);
    const rows = (await manager.query(
      `SELECT m.id, m.status, m.party_id AS "partyId", m.phone, ms.id AS "membershipId", ms.unit_id AS "unitId"
         FROM members m LEFT JOIN memberships ms ON ms.member_id = m.id AND ms.status = 'active'
         ${where.sql} AND m.id = $${where.params.length + 1}
         FOR UPDATE OF m`,
      [...where.params, id],
    )) as {
      id: string;
      status: string;
      partyId: string | null;
      phone: string | null;
      membershipId: string | null;
      unitId: string | null;
    }[];
    return rows[0] ?? null;
  },

  async unitInOrganisation(
    organisationId: string,
    unitId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const rows = (await manager.query(
      `SELECT 1 FROM organisation_units WHERE id = $1 AND organisation_id = $2 AND status = 'active'`,
      [unitId, organisationId],
    )) as unknown[];
    return rows.length > 0;
  },

  async partyIdTaken(
    organisationId: string,
    partyId: string,
    exceptId: string | null,
    manager: EntityManager,
  ) {
    const rows = (await manager.query(
      `SELECT 1 FROM members WHERE organisation_id = $1 AND party_id = $2 AND ($3::uuid IS NULL OR id <> $3)`,
      [organisationId, partyId, exceptId],
    )) as unknown[];
    return rows.length > 0;
  },

  async hasActiveExecutive(memberId: string, manager: EntityManager): Promise<boolean> {
    const rows = (await manager.query(
      `SELECT 1 FROM organisation_executives WHERE member_id = $1 AND status IN ('invited', 'active', 'suspended')`,
      [memberId],
    )) as unknown[];
    return rows.length > 0;
  },
};
