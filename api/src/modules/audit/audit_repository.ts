import { toSkipTake, type PageParams } from '../../common/http/pagination';
import type { DateRange } from '../../common/http/period';
import { dataSource } from '../../config/database';

import type { AuditEventResponse } from './audit_types';

interface AuditFilters {
  actor?: string;
  action?: string;
  organisationId?: string;
  range: DateRange;
}

const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

function queryParts(filters: AuditFilters) {
  const params: unknown[] = [];
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses: string[] = [];

  if (filters.actor) {
    const value = param(likePattern(filters.actor));
    clauses.push(`COALESCE(pa.first_name || ' ' || pa.last_name, m.first_name || ' ' || m.last_name, '') ILIKE ${value}`);
  }
  if (filters.action) clauses.push(`ae.action = ${param(filters.action)}`);
  if (filters.organisationId) {
    clauses.push(`ae.metadata ->> 'organisationId' = ${param(filters.organisationId)}`);
  }
  if (filters.range.from) clauses.push(`ae.created_at >= ${param(filters.range.from)}`);
  if (filters.range.to) clauses.push(`ae.created_at < ${param(filters.range.to)}`);

  return { params, where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '' };
}

const SELECT = `
  SELECT ae.id,
         COALESCE(pa.first_name || ' ' || pa.last_name, m.first_name || ' ' || m.last_name) AS actor,
         CASE WHEN pa.id IS NOT NULL THEN 'platform_admin'
              WHEN e.id IS NOT NULL THEN 'executive' ELSE NULL END AS "actorRole",
         ae.action, ae.outcome,
         ae.metadata ->> 'organisationId' AS "organisationId",
         o.name AS "organisationName",
         ae.target_type AS "targetType", ae.target_id AS "targetId",
         ae.metadata, ae.created_at AS "createdAt"
    FROM audit_events ae
    LEFT JOIN platform_admins pa ON pa.id = ae.actor_platform_admin_id
    LEFT JOIN organisation_executives e ON e.id = ae.actor_executive_id
    LEFT JOIN members m ON m.id = e.member_id
    LEFT JOIN organisations o ON o.id::text = ae.metadata ->> 'organisationId'`;

export const auditRepository = {
  async list(
    filters: AuditFilters,
    page: PageParams,
  ): Promise<{ rows: AuditEventResponse[]; total: number }> {
    const { params, where } = queryParts(filters);
    const { skip, take } = toSkipTake(page);
    const n = params.length;
    const [rows, [counted]] = await Promise.all([
      dataSource.query(
        `${SELECT} ${where} ORDER BY ae.created_at DESC, ae.id LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, take, skip],
      ) as Promise<AuditEventResponse[]>,
      dataSource.query(`SELECT count(*)::int AS total FROM audit_events ae
        LEFT JOIN platform_admins pa ON pa.id = ae.actor_platform_admin_id
        LEFT JOIN organisation_executives e ON e.id = ae.actor_executive_id
        LEFT JOIN members m ON m.id = e.member_id
        ${where}`, params) as Promise<{ total: number }[]>,
    ]);
    return { rows, total: counted?.total ?? 0 };
  },
};
