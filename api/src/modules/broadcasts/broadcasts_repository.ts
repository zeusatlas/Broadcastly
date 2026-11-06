import type { EntityManager } from 'typeorm';

import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type { BroadcastDetailResponse, ListBroadcastsRequest } from './broadcasts_types';

// Who may see which broadcasts: their own always; with report.view, also everything in their reach.
export interface BroadcastVisibility {
  organisationId: string;
  executiveId: string | null;
  scopeUnitIds: readonly string[] | null;
  ownOnly: boolean;
}

const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
const fullName = (alias: string) =>
  `NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', COALESCE(${alias}.middle_name || ' ', ''), ${alias}.last_name)), '')`;

const SELECT = `
  SELECT b.id,
         b.organisation_id AS "organisationId",
         o.name AS "organisationName",
         b.title,
         b.message,
         b.status,
         b.audience_summary AS "audienceSummary",
         b.recipient_count AS "recipientCount",
         b.segment_count AS "segmentCount",
         b.estimated_credits AS "estimatedCredits",
         b.delivered_count AS "deliveredCount",
         b.failed_count AS "failedCount",
         ${fullName('cm')} AS "createdBy",
         b.created_by_executive_id AS "createdById",
         jsonb_build_object('level', b.audience ->> 'level',
                            'unitIds', COALESCE(b.audience -> 'unitIds', '[]'::jsonb)) AS audience,
         b.submitted_count AS "submittedCount",
         ${fullName('sm')} AS "sentBy",
         b.scheduled_at AS "scheduledAt",
         b.submitted_at AS "submittedAt",
         b.completed_at AS "completedAt",
         b.cancelled_at AS "cancelledAt",
         b.created_at AS "createdAt",
         (SELECT json_build_object('decision', d.decision, 'reason', d.reason,
                                   'decidedBy', ${fullName('dm')}, 'decidedAt', d.created_at)
            FROM approval_decisions d
            JOIN organisation_executives de ON de.id = d.decided_by_executive_id
            JOIN members dm ON dm.id = de.member_id
           WHERE d.broadcast_id = b.id
           ORDER BY d.created_at DESC LIMIT 1) AS "latestDecision"
    FROM broadcasts b
    JOIN organisations o ON o.id = b.organisation_id
    JOIN organisation_executives ce ON ce.id = b.created_by_executive_id
    JOIN members cm ON cm.id = ce.member_id
    LEFT JOIN organisation_executives se ON se.id = b.sent_by_executive_id
    LEFT JOIN members sm ON sm.id = se.member_id`;

// Organisation-level audiences are visible to the whole organisation; unit audiences to anyone
// reaching at least one of their units.
function visibleWhere(visibility: BroadcastVisibility, params: unknown[]) {
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses = [`b.organisation_id = ${param(visibility.organisationId)}`];
  const own = () => `b.created_by_executive_id = ${param(visibility.executiveId)}::uuid`;

  if (visibility.ownOnly) clauses.push(own());
  else if (visibility.scopeUnitIds) {
    const scope = param(visibility.scopeUnitIds);
    clauses.push(`(${own()}
      OR b.audience ->> 'level' = 'constituency'
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(b.audience -> 'unitIds', '[]'::jsonb)) AS unit_id
                  WHERE unit_id::uuid = ANY(${scope}::uuid[])))`);
  }
  return clauses;
}

// Stages in the order the app shows them: work to finish first, finished work last.
const STAGE_ORDER_SQL = `CASE
    WHEN b.status = 'draft' THEN 1
    WHEN b.status IN ('pending_approval', 'approved') THEN 2
    WHEN b.status IN ('partially_failed', 'failed', 'cancelled') THEN 3
    WHEN b.status = 'scheduled' THEN 4
    WHEN b.status IN ('processing', 'submitted') THEN 5
    ELSE 6
  END`;

export const broadcastsRepository = {
  async list(
    visibility: BroadcastVisibility,
    request: ListBroadcastsRequest,
  ): Promise<Paginated<BroadcastDetailResponse>> {
    const params: unknown[] = [];
    const clauses = visibleWhere(visibility, params);
    const param = (value: unknown) => `$${params.push(value)}`;
    if (request.mine) clauses.push(`b.created_by_executive_id = ${param(visibility.executiveId)}`);
    if (request.statuses?.length)
      clauses.push(`b.status = ANY(${param(request.statuses)}::broadcast_status[])`);
    if (request.search) {
      const search = param(likePattern(request.search));
      clauses.push(
        `(b.title ILIKE ${search} OR b.message ILIKE ${search} OR b.audience_summary ILIKE ${search})`,
      );
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const { skip, take } = toSkipTake(request);
    const n = params.length;
    const direction = request.sort === 'oldest' ? 'ASC' : 'DESC';
    const order =
      request.groupBy === 'status'
        ? `${STAGE_ORDER_SQL}, b.created_at ${direction}, b.id ${direction}`
        : `b.created_at ${direction}, b.id ${direction}`;
    const [items, [count]] = await Promise.all([
      dataSource.query(
        `${SELECT} ${where} ORDER BY ${order} LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, take, skip],
      ) as Promise<BroadcastDetailResponse[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM broadcasts b ${where}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, request);
  },

  async findVisible(
    visibility: BroadcastVisibility,
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<BroadcastDetailResponse | null> {
    const params: unknown[] = [];
    const clauses = visibleWhere(visibility, params);
    clauses.push(`b.id = $${params.push(id)}`);
    const rows = (await manager.query(
      `${SELECT} WHERE ${clauses.join(' AND ')}`,
      params,
    )) as BroadcastDetailResponse[];
    return rows[0] ?? null;
  },

  async findById(
    id: string,
    manager: EntityManager = dataSource.manager,
  ): Promise<BroadcastDetailResponse | null> {
    const rows = (await manager.query(`${SELECT} WHERE b.id = $1`, [
      id,
    ])) as BroadcastDetailResponse[];
    return rows[0] ?? null;
  },

  async findByIds(ids: readonly string[]): Promise<BroadcastDetailResponse[]> {
    if (ids.length === 0) return [];
    const rows = (await dataSource.query(`${SELECT} WHERE b.id = ANY($1::uuid[])`, [
      ids,
    ])) as BroadcastDetailResponse[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  async creatorOf(broadcastId: string, manager: EntityManager) {
    const [row] = (await manager.query(
      `SELECT e.id AS "executiveId", e.member_id AS "memberId", e.status
         FROM broadcasts b JOIN organisation_executives e ON e.id = b.created_by_executive_id
        WHERE b.id = $1`,
      [broadcastId],
    )) as { executiveId: string; memberId: string; status: string }[];
    return row ?? null;
  },

  async unitTypes(organisationId: string, unitIds: readonly string[], manager: EntityManager) {
    return (await manager.query(
      `SELECT id, type, name FROM organisation_units
        WHERE organisation_id = $1 AND status = 'active' AND id = ANY($2::uuid[])`,
      [organisationId, unitIds],
    )) as { id: string; type: string; name: string }[];
  },

  // Active approvers whose appointment reaches every unit of the audience; organisation-level
  // audiences need an organisation-wide approver. Never the author.
  async approversFor(
    organisationId: string,
    authorId: string,
    unitIds: readonly string[],
    chairmanPositionId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const rows = (await manager.query(
      `SELECT DISTINCT e.id
         FROM organisation_executives e
         JOIN organisations o ON o.id = e.organisation_id AND o.status = 'active'
         JOIN appointments a ON a.member_id = e.member_id AND a.organisation_id = e.organisation_id
                            AND a.status = 'active' AND a.effective_from <= now()
                            AND (a.effective_to IS NULL OR a.effective_to > now())
        WHERE e.organisation_id = $1 AND e.status = 'active' AND e.id <> $2
          AND (a.position_id = $4 OR EXISTS (
                SELECT 1 FROM permission_grants g
                 WHERE g.appointment_id = a.id AND g.revoked_at IS NULL AND g.permission = 'broadcast.approve'))
          AND (a.unit_id IS NULL OR (cardinality($3::uuid[]) > 0 AND $3::uuid[] <@ ARRAY(
                WITH RECURSIVE reach AS (
                  SELECT a.unit_id AS id
                  UNION ALL
                  SELECT c.id FROM organisation_units c JOIN reach r ON c.parent_id = r.id)
                SELECT id FROM reach)))`,
      [organisationId, authorId, unitIds, chairmanPositionId],
    )) as { id: string }[];
    return rows.map((row) => row.id);
  },

  // Recounts a broadcast from its recipient rows; the counts on broadcasts are a cache of these.
  async recipientTotals(broadcastId: string, manager: EntityManager) {
    const [row] = (await manager.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE provider_reference IS NOT NULL)::int AS submitted,
              count(*) FILTER (WHERE status = 'delivered')::int AS delivered,
              count(*) FILTER (WHERE status = 'failed')::int AS failed,
              count(*) FILTER (WHERE status IN ('pending', 'sending'))::int AS waiting,
              count(*) FILTER (WHERE status = 'submitted')::int AS "awaitingReport"
         FROM broadcast_recipients WHERE broadcast_id = $1`,
      [broadcastId],
    )) as {
      total: number;
      submitted: number;
      delivered: number;
      failed: number;
      waiting: number;
      awaitingReport: number;
    }[];
    return row!;
  },
};
