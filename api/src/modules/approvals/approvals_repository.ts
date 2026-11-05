import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';
import { broadcastsRepository, type BroadcastDetailResponse } from '../broadcasts';

import type { ListApprovalsRequest } from './approvals_types';

export interface ApproverReach {
  organisationId: string;
  executiveId: string;
  scopeUnitIds: readonly string[] | null;
}

const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

// An approver decides only broadcasts whose every unit they reach; organisation-level audiences
// need an organisation-wide approver (BR-06). Nobody approves their own.
export function decidableSql(reach: ApproverReach, params: unknown[]) {
  const param = (value: unknown) => `$${params.push(value)}`;
  const clauses = [
    `b.organisation_id = ${param(reach.organisationId)}`,
    `b.created_by_executive_id <> ${param(reach.executiveId)}`,
  ];
  if (reach.scopeUnitIds) {
    const scope = param(reach.scopeUnitIds);
    clauses.push(`b.audience ->> 'level' <> 'constituency'
      AND jsonb_array_length(COALESCE(b.audience -> 'unitIds', '[]'::jsonb)) > 0
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(b.audience -> 'unitIds') AS unit_id
                       WHERE NOT (unit_id::uuid = ANY(${scope}::uuid[])))`);
  }
  return clauses;
}

export const approvalsRepository = {
  async list(
    reach: ApproverReach,
    request: ListApprovalsRequest,
  ): Promise<Paginated<BroadcastDetailResponse>> {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses =
      request.status === 'decided'
        ? [
            `b.organisation_id = ${param(reach.organisationId)}`,
            `EXISTS (SELECT 1 FROM approval_decisions d WHERE d.broadcast_id = b.id
                       AND d.decided_by_executive_id = ${param(reach.executiveId)})`,
          ]
        : [...decidableSql(reach, params), `b.status = 'pending_approval'`];
    if (request.search) {
      const search = param(likePattern(request.search));
      clauses.push(
        `(b.title ILIKE ${search} OR b.message ILIKE ${search} OR b.audience_summary ILIKE ${search})`,
      );
    }
    const where = clauses.join(' AND ');
    const order = request.status === 'decided' ? 'b.updated_at DESC' : 'b.submitted_at ASC';
    const { skip, take } = toSkipTake(request);
    const [ids, [count]] = await Promise.all([
      dataSource.query(
        `SELECT b.id FROM broadcasts b WHERE ${where} ORDER BY ${order}, b.id
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, take, skip],
      ) as Promise<{ id: string }[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM broadcasts b WHERE ${where}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    const items = await broadcastsRepository.findByIds(ids.map((row) => row.id));
    return toPaginated(items, count?.total ?? 0, request);
  },
};
