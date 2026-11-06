import type { EntityManager } from 'typeorm';

import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app_error';
import type { Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService } from '../audit';
import { actorFrom, auditActor, type AccessContext } from '../auth';
import {
  Broadcast,
  broadcastsRepository,
  broadcastsService,
  type BroadcastDetailResponse,
} from '../broadcasts';
import { notificationsService } from '../notifications';

import { approvalsRepository, decidableSql, type ApproverReach } from './approvals_repository';
import type {
  ApprovalDetailResponse,
  ApprovalDecisionValue,
  DecisionRecordResponse,
  ListApprovalsRequest,
} from './approvals_types';
import { ApprovalDecision } from './entities/approval_decision_entity';

const NOT_FOUND = 'Broadcast not found.';

const reachOf = (auth: AccessContext): ApproverReach => {
  if (auth.kind !== 'executive' || !auth.organisationId) {
    throw new ForbiddenError('Only executives of an organisation can do this.');
  }
  return {
    organisationId: auth.organisationId,
    executiveId: auth.accountId,
    scopeUnitIds: auth.organisationWide ? null : auth.scopeUnitIds,
  };
};

async function canDecide(reach: ApproverReach, broadcastId: string, manager: EntityManager) {
  const params: unknown[] = [];
  const clauses = decidableSql(reach, params);
  const rows = (await manager.query(
    `SELECT 1 FROM broadcasts b WHERE ${clauses.join(' AND ')} AND b.id = $${params.push(broadcastId)}`,
    params,
  )) as unknown[];
  return rows.length > 0;
}

// Locks a broadcast the caller may decide and that is still waiting (FR-APR-02).
async function lockPending(reach: ApproverReach, broadcastId: string, manager: EntityManager) {
  const broadcast = await manager.getRepository(Broadcast).findOne({
    where: { id: broadcastId, organisationId: reach.organisationId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!broadcast || !(await canDecide(reach, broadcastId, manager)))
    throw new NotFoundError(NOT_FOUND);
  if (broadcast.status !== 'pending_approval')
    throw new ConflictError('This broadcast is no longer waiting for approval.');
  return broadcast;
}

async function record(
  auth: AccessContext,
  context: RequestContext,
  broadcast: Broadcast,
  decision: ApprovalDecisionValue,
  reason: string | null,
  manager: EntityManager,
) {
  await manager.getRepository(ApprovalDecision).insert({
    organisationId: broadcast.organisationId,
    broadcastId: broadcast.id,
    decidedByExecutiveId: auth.accountId,
    decision,
    reason,
  });
  await auditService.record(
    {
      action:
        decision === 'approved' ? AUDIT_ACTIONS.broadcastApproved : AUDIT_ACTIONS.broadcastRejected,
      targetType: 'broadcast',
      targetId: broadcast.id,
      metadata: { hasReason: reason !== null },
      ...auditActor(actorFrom(auth, context)),
    },
    manager,
  );
  const name = broadcast.title ?? 'Your broadcast';
  await notificationsService.notify(
    {
      organisationId: broadcast.organisationId,
      executiveIds: [broadcast.createdByExecutiveId],
      type: 'approval_decision',
      title: decision === 'approved' ? 'Broadcast approved' : 'Broadcast rejected',
      body:
        decision === 'approved'
          ? `“${name}” was approved${broadcast.status === 'scheduled' ? ' and is scheduled' : ' and is sending'}.`
          : `“${name}” was returned to drafts: ${reason}`,
      broadcastId: broadcast.id,
    },
    manager,
  );
}

export const approvalsService = {
  list(
    auth: AccessContext,
    request: ListApprovalsRequest,
  ): Promise<Paginated<BroadcastDetailResponse>> {
    return approvalsRepository.list(reachOf(auth), request);
  },

  async get(auth: AccessContext, broadcastId: string): Promise<ApprovalDetailResponse> {
    const reach = reachOf(auth);
    const [broadcast, decisions, decidable] = await Promise.all([
      broadcastsRepository.findById(broadcastId),
      dataSource.query(
        `SELECT d.decision, d.reason, d.created_at AS "decidedAt", d.decided_by_executive_id AS "decidedById",
                TRIM(CONCAT(m.first_name, ' ', m.last_name)) AS "decidedBy"
           FROM approval_decisions d
           JOIN organisation_executives e ON e.id = d.decided_by_executive_id
           JOIN members m ON m.id = e.member_id
          WHERE d.broadcast_id = $1 ORDER BY d.created_at DESC`,
        [broadcastId],
      ) as Promise<(DecisionRecordResponse & { decidedById: string })[]>,
      canDecide(reach, broadcastId, dataSource.manager),
    ]);
    const decidedByMe = decisions.some((decision) => decision.decidedById === reach.executiveId);
    if (
      !broadcast ||
      broadcast.organisationId !== reach.organisationId ||
      !(decidable || decidedByMe)
    ) {
      throw new NotFoundError(NOT_FOUND);
    }

    // The author pays from their own wallet, so that is the balance the approver needs to see.
    const author = await broadcastsRepository.creatorOf(broadcastId, dataSource.manager);
    const [wallet] = (await dataSource.query(
      `SELECT balance - reserved AS available FROM wallets WHERE executive_id = $1`,
      [author?.executiveId ?? null],
    )) as { available: number }[];

    return {
      broadcast,
      decisions: decisions.map(({ decidedById: _, ...decision }) => decision),
      walletAvailable: wallet?.available ?? 0,
      canDecide: decidable && broadcast.status === 'pending_approval',
    };
  },

  // Approval releases the broadcast: credits are reserved and it is queued in the same step (UC-03).
  async approve(
    auth: AccessContext,
    broadcastId: string,
    reason: string | undefined,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    const { detail, scheduledAt } = await dataSource.transaction(async (manager) => {
      const broadcast = await lockPending(reach, broadcastId, manager);
      await broadcastsService.startDispatch(broadcast, auth.accountId, null, manager);
      await record(auth, context, broadcast, 'approved', reason ?? null, manager);
      return {
        detail: (await broadcastsRepository.findById(broadcastId, manager))!,
        scheduledAt: broadcast.scheduledAt,
      };
    });
    broadcastsService.queueDispatch(broadcastId, scheduledAt);
    return detail;
  },

  // A rejected broadcast goes back to its author's drafts with the reason (FR-APR-03, FR-APR-04).
  async reject(
    auth: AccessContext,
    broadcastId: string,
    reason: string,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    return dataSource.transaction(async (manager) => {
      const broadcast = await lockPending(reach, broadcastId, manager);
      broadcast.status = 'draft';
      await manager.getRepository(Broadcast).save(broadcast);
      await record(auth, context, broadcast, 'rejected', reason, manager);
      return (await broadcastsRepository.findById(broadcastId, manager))!;
    });
  },
};
