import type { EntityManager } from 'typeorm';

import type { BroadcastAudienceRequest, RecipientCounts } from './broadcasts_types';

export interface RecipientReach {
  organisationId: string;
  // null = organisation-wide; otherwise the author's units, descendants included.
  scopeUnitIds: readonly string[] | null;
}

const VALID_PHONE = `'^\\+233[235][0-9]{8}$'`;

// One statement for both the estimate and the dispatch, so the preview counts what is sent.
// Only active members inside the author's reach; invalid and opted-out numbers are classified, not sent.
function candidatesSql(
  audience: BroadcastAudienceRequest,
  reach: RecipientReach,
  params: unknown[],
) {
  const param = (value: unknown) => `$${params.push(value)}`;
  const organisation = param(reach.organisationId);
  const scope = reach.scopeUnitIds ? param(reach.scopeUnitIds) : null;
  const picked = audience.unitIds?.length ? param(audience.unitIds) : null;

  const unitFilter = (column: string) =>
    [
      picked ? `${column} IN (SELECT id FROM picked)` : null,
      scope ? `${column} = ANY(${scope}::uuid[])` : null,
    ].filter(Boolean);

  let source: string;
  if (audience.level === 'executive_group') {
    const filters = unitFilter('a.unit_id');
    source = `EXISTS (
      SELECT 1 FROM organisation_executives e JOIN appointments a ON a.member_id = e.member_id
       WHERE e.member_id = m.id AND e.status = 'active' AND a.status = 'active'
       ${filters.map((filter) => `AND ${filter}`).join(' ')})`;
  } else {
    const filters = unitFilter('ms.unit_id');
    source =
      filters.length === 0
        ? 'TRUE'
        : `EXISTS (SELECT 1 FROM memberships ms WHERE ms.member_id = m.id AND ms.status = 'active'
                    AND ${filters.join(' AND ')})`;
  }

  return `WITH RECURSIVE picked AS (
      SELECT id FROM organisation_units
       WHERE organisation_id = ${organisation} AND ${picked ? `id = ANY(${picked}::uuid[])` : 'FALSE'}
      UNION
      SELECT c.id FROM organisation_units c JOIN picked p ON c.parent_id = p.id
    ),
    candidates AS (
      SELECT m.id, m.phone,
             COALESCE(m.phone ~ ${VALID_PHONE}, FALSE) AS valid
        FROM members m
       WHERE m.organisation_id = ${organisation} AND m.status = 'active' AND ${source}
    )`;
}

export const recipientResolver = {
  async count(
    audience: BroadcastAudienceRequest,
    reach: RecipientReach,
    manager: EntityManager,
  ): Promise<RecipientCounts> {
    const params: unknown[] = [];
    const [row] = (await manager.query(
      `${candidatesSql(audience, reach, params)}
       SELECT count(*)::int AS matched,
              count(DISTINCT phone) FILTER (WHERE valid)::int AS "recipientCount",
              count(*) FILTER (WHERE valid)::int AS eligible,
              count(*) FILTER (WHERE NOT valid)::int AS "invalidCount"
         FROM candidates`,
      params,
    )) as (Omit<RecipientCounts, 'duplicateCount'> & { eligible: number })[];
    const { eligible = 0, ...counts } = row ?? {
      matched: 0,
      recipientCount: 0,
      invalidCount: 0,
    };
    return { ...counts, duplicateCount: eligible - counts.recipientCount };
  },

  // Writes one row per distinct number (BR-07). Safe to repeat: existing rows are kept.
  async materialise(
    broadcastId: string,
    audience: BroadcastAudienceRequest,
    reach: RecipientReach,
    manager: EntityManager,
  ): Promise<number> {
    const params: unknown[] = [];
    const sql = candidatesSql(audience, reach, params);
    const broadcast = `$${params.push(broadcastId)}`;
    await manager.query(
      `${sql}
       INSERT INTO broadcast_recipients (broadcast_id, member_id, phone)
       SELECT DISTINCT ON (phone) ${broadcast}::uuid, id, phone
         FROM candidates WHERE valid
        ORDER BY phone, id
       ON CONFLICT (broadcast_id, phone) DO NOTHING`,
      params,
    );
    const [row] = (await manager.query(
      `SELECT count(*)::int AS total FROM broadcast_recipients WHERE broadcast_id = $1`,
      [broadcastId],
    )) as { total: number }[];
    return row?.total ?? 0;
  },
};
