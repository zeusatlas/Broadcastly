import type { EntityManager } from 'typeorm';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app_error';
import type { Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { bulkSmsProvider } from '../../integrations/sms/sms_provider';
import { getQueue, QUEUE_NAMES } from '../../jobs/queues';
import { AUDIT_ACTIONS, auditService, type AuditAction } from '../audit';
import { actorFrom, auditActor, type AccessContext } from '../auth';
import { ledgerService } from '../credits';
import { notificationsService, type NotificationType } from '../notifications';
import { CHAIRMAN_POSITION_ID, organisationService } from '../organisation';

import { broadcastsRepository, type BroadcastVisibility } from './broadcasts_repository';
import type {
  BroadcastAudienceRequest,
  BroadcastDetailResponse,
  BroadcastEstimateResponse,
  CreateBroadcastRequest,
  DeliveryReportResponse,
  DispatchBroadcastRequest,
  EstimateBroadcastRequest,
  ListBroadcastsRequest,
  UpdateBroadcastRequest,
} from './broadcasts_types';
import { Broadcast } from './entities/broadcast_entity';
import { recipientResolver, type RecipientReach } from './recipient_resolver';
import {
  estimateBroadcastSegments,
  estimateSmsSegments,
  personalise,
  unfilledFields,
} from './sms_segments';

const NOT_FOUND = 'Broadcast not found.';
const scheduledAtOf = (broadcast: Broadcast) => broadcast.scheduledAt;
const CANCELLABLE = new Set(['draft', 'pending_approval', 'scheduled']);
const LEVEL_NAMES: Record<string, string> = {
  electoral_area: 'electoral areas',
  branch: 'branches',
  polling_station: 'polling stations',
};

const organisationOf = (auth: AccessContext) => {
  if (auth.kind !== 'executive' || !auth.organisationId) {
    throw new ForbiddenError('Only executives of an organisation can do this.');
  }
  return auth.organisationId;
};
const reachOf = (auth: AccessContext): RecipientReach => ({
  organisationId: organisationOf(auth),
  scopeUnitIds: auth.organisationWide ? null : auth.scopeUnitIds,
});
const visibilityOf = (auth: AccessContext): BroadcastVisibility => ({
  ...reachOf(auth),
  executiveId: auth.accountId,
  ownOnly: !auth.permissions.has('report.view'),
});

async function audit(
  auth: AccessContext,
  context: RequestContext,
  action: AuditAction,
  broadcastId: string,
  manager: EntityManager,
  metadata: Record<string, unknown> = {},
) {
  await auditService.record(
    {
      action,
      targetType: 'broadcast',
      targetId: broadcastId,
      metadata,
      ...auditActor(actorFrom(auth, context)),
    },
    manager,
  );
}

async function checkAudience(
  reach: RecipientReach,
  audience: BroadcastAudienceRequest,
  manager: EntityManager,
): Promise<string> {
  const unitIds = [...new Set(audience.unitIds ?? [])];
  if (audience.level === 'constituency') {
    if (reach.scopeUnitIds)
      throw new ForbiddenError('An organisation-wide broadcast is outside your assigned scope.');
    if (unitIds.length)
      throw new ValidationError({ audience: ['Leave units empty for the whole organisation.'] });
    return 'Whole organisation';
  }
  if (audience.level !== 'executive_group' && unitIds.length === 0) {
    throw new ValidationError({ audience: ['Select at least one unit.'] });
  }
  const units = unitIds.length
    ? await broadcastsRepository.unitTypes(reach.organisationId, unitIds, manager)
    : [];
  if (units.length !== unitIds.length) {
    throw new ValidationError({ audience: ['Choose active units in your organisation.'] });
  }
  if (audience.level !== 'executive_group' && units.some((unit) => unit.type !== audience.level)) {
    throw new ValidationError({ audience: ['Every selected unit must be of the chosen level.'] });
  }
  if (reach.scopeUnitIds && unitIds.some((id) => !reach.scopeUnitIds!.includes(id))) {
    throw new ForbiddenError('One or more selected units are outside your assigned scope.');
  }
  const named =
    units.length === 1
      ? units[0]!.name
      : `${units.length} ${LEVEL_NAMES[audience.level] ?? 'units'}`;
  return audience.level === 'executive_group'
    ? units.length
      ? `Executives in ${named}`
      : 'Executives'
    : named;
}

function requireFilled(message: string) {
  const fields = unfilledFields(message);
  if (fields.length)
    throw new ValidationError({ message: [`Fill in ${fields.join(', ')} before sending.`] });
}

async function lockOwn(
  auth: AccessContext,
  broadcastId: string,
  manager: EntityManager,
): Promise<Broadcast> {
  const broadcast = await manager.getRepository(Broadcast).findOne({
    where: { id: broadcastId, organisationId: organisationOf(auth) },
    lock: { mode: 'pessimistic_write' },
  });
  if (!broadcast || broadcast.createdByExecutiveId !== auth.accountId)
    throw new NotFoundError(NOT_FOUND);
  return broadcast;
}

async function availableIn(
  owner: { organisationId: string; executiveId?: string },
  manager: EntityManager,
) {
  const [row] = (await manager.query(
    owner.executiveId
      ? `SELECT balance - reserved AS available FROM wallets WHERE executive_id = $1`
      : `SELECT balance - reserved AS available FROM wallets WHERE organisation_id = $1 AND owner_type = 'organisation'`,
    [owner.executiveId ?? owner.organisationId],
  )) as { available: number }[];
  return row?.available ?? 0;
}

function enqueueDispatch(broadcastId: string, scheduledAt: Date | null) {
  const delay = scheduledAt ? Math.max(scheduledAt.getTime() - Date.now(), 0) : 0;
  getQueue(QUEUE_NAMES.smsDispatch)
    .add('dispatch', { broadcastId }, { jobId: broadcastId, delay })
    .catch((error: unknown) =>
      logger.error({ err: error, broadcastId }, 'Could not queue broadcast dispatch'),
    );
}

async function notifyOutcome(broadcast: Broadcast, manager: EntityManager) {
  const failed = broadcast.status === 'failed';
  const type: NotificationType = failed
    ? 'broadcast_failed'
    : broadcast.status === 'partially_failed'
      ? 'broadcast_partially_failed'
      : 'broadcast_delivered';
  const name = broadcast.title ?? 'Your broadcast';
  await notificationsService.notify(
    {
      organisationId: broadcast.organisationId,
      executiveIds: [broadcast.createdByExecutiveId, broadcast.sentByExecutiveId].filter(
        (id): id is string => !!id,
      ),
      type,
      title: failed
        ? 'Broadcast failed'
        : broadcast.status === 'submitted'
          ? 'Broadcast sent'
          : 'Broadcast delivered',
      body: failed
        ? `“${name}” could not be sent to anyone.`
        : `“${name}”: ${broadcast.submittedCount} sent, ${broadcast.deliveredCount} delivered, ${broadcast.failedCount} failed.`,
      broadcastId: broadcast.id,
    },
    manager,
  );
}

async function consumedCredits(broadcast: Broadcast, manager: EntityManager): Promise<number> {
  const rows = (await manager.query(
    `SELECT m.first_name AS "firstName" FROM broadcast_recipients r LEFT JOIN members m ON m.id = r.member_id
      WHERE r.broadcast_id = $1 AND r.provider_reference IS NOT NULL`,
    [broadcast.id],
  )) as { firstName: string | null }[];
  return rows.reduce(
    (total, row) =>
      total + estimateSmsSegments(personalise(broadcast.message, row.firstName)).segments,
    0,
  );
}

async function refreshOutcome(broadcastId: string, manager: EntityManager) {
  const broadcast = await manager.getRepository(Broadcast).findOne({
    where: { id: broadcastId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!broadcast || !['processing', 'submitted'].includes(broadcast.status)) return;
  const totals = await broadcastsRepository.recipientTotals(broadcastId, manager);
  if (totals.waiting > 0) return;

  const wasProcessing = broadcast.status === 'processing';
  Object.assign(broadcast, {
    recipientCount: totals.total,
    submittedCount: totals.submitted,
    deliveredCount: totals.delivered,
    failedCount: totals.failed,
  });
  if (totals.submitted === 0 || (totals.awaitingReport === 0 && totals.failed === totals.total)) {
    broadcast.status = 'failed';
  } else if (totals.awaitingReport > 0) {
    broadcast.status = 'submitted';
  } else {
    broadcast.status = totals.failed > 0 ? 'partially_failed' : 'completed';
  }
  const isFinal = !['processing', 'submitted'].includes(broadcast.status);
  if (isFinal) broadcast.completedAt = new Date();
  await manager.getRepository(Broadcast).save(broadcast);

  if (wasProcessing) {
    await ledgerService.settle(
      broadcast.id,
      await consumedCredits(broadcast, manager),
      broadcast.sentByExecutiveId,
      manager,
    );
  }
  if (wasProcessing || isFinal) await notifyOutcome(broadcast, manager);
}

export const broadcastsService = {
  async estimate(
    auth: AccessContext,
    request: EstimateBroadcastRequest,
  ): Promise<BroadcastEstimateResponse> {
    const reach = reachOf(auth);
    const segments = estimateBroadcastSegments(request.message);
    const isChairman = auth.role === 'chairman';
    return dataSource.transaction('REPEATABLE READ', async (manager) => {
      await checkAudience(reach, request.audience, manager);
      const counts = await recipientResolver.count(request.audience, reach, manager);
      const owner = isChairman
        ? { organisationId: reach.organisationId }
        : { organisationId: reach.organisationId, executiveId: auth.accountId };
      return {
        ...counts,
        ...segments,
        estimatedCredits: counts.recipientCount * segments.segments,
        wallet: {
          owner: isChairman ? 'organisation' : 'executive',
          available: await availableIn(owner, manager),
        },
      };
    });
  },

  async createDraft(
    auth: AccessContext,
    request: CreateBroadcastRequest,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    return dataSource.transaction(async (manager) => {
      const audienceSummary = await checkAudience(reach, request.audience, manager);
      const counts = await recipientResolver.count(request.audience, reach, manager);
      const { segments } = estimateBroadcastSegments(request.message);
      const { identifiers } = await manager.getRepository(Broadcast).insert({
        organisationId: reach.organisationId,
        createdByExecutiveId: auth.accountId,
        title: request.title ?? null,
        message: request.message,
        status: 'draft',
        audience: {
          level: request.audience.level,
          unitIds: [...new Set(request.audience.unitIds ?? [])],
        },
        audienceSummary,
        recipientCount: counts.recipientCount,
        segmentCount: segments,
        estimatedCredits: counts.recipientCount * segments,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
      });
      const id = identifiers[0]!.id as string;
      await audit(auth, context, AUDIT_ACTIONS.broadcastDraftCreated, id, manager, {
        level: request.audience.level,
      });
      return (await broadcastsRepository.findById(id, manager))!;
    });
  },

  async updateDraft(
    auth: AccessContext,
    broadcastId: string,
    request: UpdateBroadcastRequest,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    return dataSource.transaction(async (manager) => {
      const broadcast = await lockOwn(auth, broadcastId, manager);
      if (broadcast.status !== 'draft') throw new ConflictError('Only a draft can be edited.');
      if (request.title !== undefined) broadcast.title = request.title;
      if (request.message !== undefined) broadcast.message = request.message;
      if (request.scheduledAt !== undefined)
        broadcast.scheduledAt = request.scheduledAt ? new Date(request.scheduledAt) : null;
      if (request.audience) {
        broadcast.audienceSummary = await checkAudience(reach, request.audience, manager);
        broadcast.audience = {
          level: request.audience.level,
          unitIds: [...new Set(request.audience.unitIds ?? [])],
        };
      }
      const audience = broadcast.audience as unknown as BroadcastAudienceRequest;
      const counts = await recipientResolver.count(audience, reach, manager);
      broadcast.segmentCount = estimateBroadcastSegments(broadcast.message).segments;
      broadcast.recipientCount = counts.recipientCount;
      broadcast.estimatedCredits = counts.recipientCount * broadcast.segmentCount;
      await manager.getRepository(Broadcast).save(broadcast);
      await audit(auth, context, AUDIT_ACTIONS.broadcastDraftUpdated, broadcastId, manager, {
        changed: Object.keys(request),
      });
      return (await broadcastsRepository.findById(broadcastId, manager))!;
    });
  },

  async submit(
    auth: AccessContext,
    broadcastId: string,
    request: DispatchBroadcastRequest,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    return dataSource.transaction(async (manager) => {
      const broadcast = await lockOwn(auth, broadcastId, manager);
      if (broadcast.status !== 'draft')
        throw new ConflictError('Only a draft can be submitted for approval.');
      requireFilled(broadcast.message);
      if (request.scheduledAt !== undefined)
        broadcast.scheduledAt = request.scheduledAt ? new Date(request.scheduledAt) : null;
      if (broadcast.scheduledAt && broadcast.scheduledAt.getTime() <= Date.now())
        broadcast.scheduledAt = null;
      const audience = broadcast.audience as unknown as BroadcastAudienceRequest;
      await checkAudience(reach, audience, manager);
      const counts = await recipientResolver.count(audience, reach, manager);
      if (counts.recipientCount === 0)
        throw new ValidationError({ audience: ['No one in this audience can receive SMS.'] });

      broadcast.status = 'pending_approval';
      broadcast.submittedAt = new Date();
      broadcast.recipientCount = counts.recipientCount;
      broadcast.estimatedCredits = counts.recipientCount * broadcast.segmentCount;
      await manager.getRepository(Broadcast).save(broadcast);
      await audit(auth, context, AUDIT_ACTIONS.broadcastSubmitted, broadcastId, manager);

      const approvers = await broadcastsRepository.approversFor(
        reach.organisationId,
        auth.accountId,
        audience.level === 'constituency' ? [] : (audience.unitIds ?? []),
        CHAIRMAN_POSITION_ID,
        manager,
      );
      const detail = (await broadcastsRepository.findById(broadcastId, manager))!;
      await notificationsService.notify(
        {
          organisationId: reach.organisationId,
          executiveIds: approvers,
          type: 'approval_request',
          title: 'Approval requested',
          body: `${detail.createdBy ?? 'An executive'} sent “${detail.title ?? 'a broadcast'}” for approval.`,
          broadcastId,
        },
        manager,
      );
      return detail;
    });
  },

  // Direct send by an author with send rights (FR-APR-06). A repeated request with the same
  // Idempotency-Key returns the broadcast it already dispatched (FR-SMS-14).
  async send(
    auth: AccessContext,
    broadcastId: string,
    request: DispatchBroadcastRequest,
    idempotencyKey: string | undefined,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const reach = reachOf(auth);
    const { detail, scheduledAt } = await dataSource.transaction(async (manager) => {
      const broadcast = await lockOwn(auth, broadcastId, manager);
      if (broadcast.status !== 'draft') {
        if (idempotencyKey && broadcast.dispatchKey === idempotencyKey) {
          return {
            detail: (await broadcastsRepository.findById(broadcastId, manager))!,
            scheduledAt: undefined,
          };
        }
        throw new ConflictError('This broadcast has already been sent or submitted.');
      }
      requireFilled(broadcast.message);
      await checkAudience(
        reach,
        broadcast.audience as unknown as BroadcastAudienceRequest,
        manager,
      );
      if (request.scheduledAt !== undefined)
        broadcast.scheduledAt = request.scheduledAt ? new Date(request.scheduledAt) : null;
      await broadcastsService.startDispatch(
        broadcast,
        auth.accountId,
        idempotencyKey ?? null,
        manager,
      );
      await audit(auth, context, AUDIT_ACTIONS.broadcastDispatched, broadcastId, manager, {
        recipients: broadcast.recipientCount,
        credits: broadcast.estimatedCredits,
        scheduled: scheduledAtOf(broadcast) !== null,
      });
      return {
        detail: (await broadcastsRepository.findById(broadcastId, manager))!,
        scheduledAt: broadcast.scheduledAt,
      };
    });
    if (scheduledAt !== undefined) enqueueDispatch(broadcastId, scheduledAt);
    return detail;
  },

  // Reserves the author's credits and marks the broadcast scheduled or processing, inside the
  // caller's transaction; the caller queues the job after commit. Also used by approvals.
  async startDispatch(
    broadcast: Broadcast,
    senderId: string,
    dispatchKey: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const author = await broadcastsRepository.creatorOf(broadcast.id, manager);
    const access = author
      ? await organisationService.getActiveAccess(author.memberId, { scope: true })
      : null;
    if (!author || author.status !== 'active' || !access?.hasActiveAppointment) {
      throw new ConflictError(
        'The author of this broadcast no longer holds an active appointment.',
      );
    }
    const reach: RecipientReach = {
      organisationId: broadcast.organisationId,
      scopeUnitIds: access.organisationWide ? null : access.scopeUnitIds,
    };
    const audience = broadcast.audience as unknown as BroadcastAudienceRequest;
    const counts = await recipientResolver.count(audience, reach, manager);
    if (counts.recipientCount === 0)
      throw new ValidationError({ audience: ['No one in this audience can receive SMS.'] });

    const segments = estimateBroadcastSegments(broadcast.message).segments;
    const credits = counts.recipientCount * segments;
    // Hybrid policy (owner, 2026-11-05): the chairman spends the organisation wallet, others their own.
    const owner = access.holdsChairman
      ? { organisationId: broadcast.organisationId }
      : { organisationId: broadcast.organisationId, executiveId: author.executiveId };
    const wallet = await ledgerService.walletFor(owner, manager);
    const available = wallet.balance - wallet.reserved;
    if (available < credits) {
      throw new ConflictError(
        `Not enough credits: this broadcast needs ${credits.toLocaleString()} and ${available.toLocaleString()} are available.`,
      );
    }
    await ledgerService.reserve(wallet.id, broadcast.id, credits, manager);

    const isScheduled = !!broadcast.scheduledAt && broadcast.scheduledAt.getTime() > Date.now();
    Object.assign(broadcast, {
      status: isScheduled ? 'scheduled' : 'processing',
      scheduledAt: isScheduled ? broadcast.scheduledAt : null,
      recipientCount: counts.recipientCount,
      segmentCount: segments,
      estimatedCredits: credits,
      sentByExecutiveId: senderId,
      dispatchKey,
      submittedAt: broadcast.submittedAt ?? new Date(),
    });
    await manager.getRepository(Broadcast).save(broadcast);
  },

  queueDispatch: enqueueDispatch,

  async cancel(
    auth: AccessContext,
    broadcastId: string,
    context: RequestContext,
  ): Promise<BroadcastDetailResponse> {
    const visibility = visibilityOf(auth);
    const detail = await dataSource.transaction(async (manager) => {
      const broadcast = await manager.getRepository(Broadcast).findOne({
        where: { id: broadcastId, organisationId: visibility.organisationId },
        lock: { mode: 'pessimistic_write' },
      });
      const isAuthor = broadcast?.createdByExecutiveId === auth.accountId;
      const canManage =
        (auth.permissions.has('broadcast.send') || auth.permissions.has('broadcast.approve')) &&
        !!(await broadcastsRepository.findVisible(
          { ...visibility, ownOnly: false },
          broadcastId,
          manager,
        ));
      if (!broadcast || (!isAuthor && !canManage)) throw new NotFoundError(NOT_FOUND);
      if (!CANCELLABLE.has(broadcast.status)) {
        throw new ConflictError(
          'Only a draft, a broadcast awaiting approval or a scheduled one can be cancelled.',
        );
      }
      const wasScheduled = broadcast.status === 'scheduled';
      broadcast.status = 'cancelled';
      broadcast.cancelledAt = new Date();
      await manager.getRepository(Broadcast).save(broadcast);
      if (wasScheduled) await ledgerService.settle(broadcastId, 0, auth.accountId, manager);
      await audit(auth, context, AUDIT_ACTIONS.broadcastCancelled, broadcastId, manager);
      return (await broadcastsRepository.findById(broadcastId, manager))!;
    });
    getQueue(QUEUE_NAMES.smsDispatch)
      .remove(broadcastId)
      .catch(() => undefined);
    return detail;
  },

  list(
    auth: AccessContext,
    request: ListBroadcastsRequest,
  ): Promise<Paginated<BroadcastDetailResponse>> {
    return broadcastsRepository.list(visibilityOf(auth), request);
  },

  async get(auth: AccessContext, broadcastId: string): Promise<BroadcastDetailResponse> {
    const broadcast = await broadcastsRepository.findVisible(visibilityOf(auth), broadcastId);
    if (!broadcast) throw new NotFoundError(NOT_FOUND);
    return broadcast;
  },

  // The dispatch job (FR-NOT-03). Idempotent per recipient: rows move pending → sending → submitted,
  // and a row left 'sending' by a crash becomes 'unknown' instead of being sent again (BR-13).
  async runDispatch(broadcastId: string, ratePerSecond: number): Promise<void> {
    const claim = await dataSource.transaction(async (manager) => {
      const broadcast = await manager.getRepository(Broadcast).findOne({
        where: { id: broadcastId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!broadcast || !['scheduled', 'processing'].includes(broadcast.status)) return null;
      if (
        broadcast.status === 'scheduled' &&
        (broadcast.scheduledAt?.getTime() ?? 0) > Date.now() + 5_000
      )
        return null;
      const [held] = (await manager.query(
        `SELECT 1 FROM credit_reservations WHERE broadcast_id = $1 AND status = 'held'`,
        [broadcastId],
      )) as unknown[];
      if (!held) {
        await manager
          .getRepository(Broadcast)
          .update({ id: broadcastId }, { status: 'failed', completedAt: new Date() });
        logger.warn({ broadcastId }, 'Broadcast had no credit reservation; not sent (BR-10)');
        return null;
      }

      const { total } = await broadcastsRepository.recipientTotals(broadcastId, manager);
      if (total === 0) {
        const author = await broadcastsRepository.creatorOf(broadcastId, manager);
        const access = author
          ? await organisationService.getActiveAccess(author.memberId, { scope: true })
          : null;
        if (access?.hasActiveAppointment) {
          await recipientResolver.materialise(
            broadcastId,
            broadcast.audience as unknown as BroadcastAudienceRequest,
            {
              organisationId: broadcast.organisationId,
              scopeUnitIds: access.organisationWide ? null : access.scopeUnitIds,
            },
            manager,
          );
        }
      }
      await manager.query(
        `UPDATE broadcast_recipients SET status = 'unknown', error = 'Interrupted while sending', status_at = now()
          WHERE broadcast_id = $1 AND status = 'sending'`,
        [broadcastId],
      );
      broadcast.status = 'processing';
      await manager.getRepository(Broadcast).save(broadcast);
      return { message: broadcast.message };
    });
    if (!claim) return;

    for (;;) {
      const startedAt = Date.now();
      const batch = (await dataSource.query(
        `UPDATE broadcast_recipients r SET status = 'sending', updated_at = now()
           FROM (SELECT id FROM broadcast_recipients WHERE broadcast_id = $1 AND status = 'pending'
                  ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED) picked
          WHERE r.id = picked.id
          RETURNING r.id, r.phone, (SELECT first_name FROM members WHERE id = r.member_id) AS "firstName"`,
        [broadcastId, ratePerSecond],
      )) as [{ id: string; phone: string; firstName: string | null }[], number];
      const rows = batch[0];
      if (rows.length === 0) break;

      let results;
      try {
        results = await bulkSmsProvider.sendBatch(
          rows.map((row) => ({
            recipientId: row.id,
            to: row.phone,
            body: personalise(claim.message, row.firstName),
          })),
        );
      } catch (error) {
        // The provider refused the whole call, so nothing in it went out: queue the batch again.
        await dataSource.query(
          `UPDATE broadcast_recipients SET status = 'pending' WHERE id = ANY($1::uuid[]) AND status = 'sending'`,
          [rows.map((row) => row.id)],
        );
        throw error;
      }
      await dataSource.query(
        `UPDATE broadcast_recipients r
            SET status = (CASE WHEN x.reference IS NULL THEN 'failed' ELSE 'submitted' END)::recipient_status,
                provider_reference = x.reference, error = x.error,
                submitted_at = now(), status_at = now(), updated_at = now()
           FROM unnest($1::uuid[], $2::text[], $3::text[]) AS x(id, reference, error)
          WHERE r.id = x.id AND r.status = 'sending'`,
        [
          results.map((result) => result.recipientId),
          results.map((result) => result.providerReference),
          results.map((result) =>
            result.providerReference
              ? null
              : (result.error ?? 'Rejected by the provider').slice(0, 255),
          ),
        ],
      );
      const wait = 1_000 - (Date.now() - startedAt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }

    await dataSource.transaction((manager) => refreshOutcome(broadcastId, manager));
  },

  async applyDeliveryReport(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<DeliveryReportResponse> {
    let updates;
    try {
      updates = bulkSmsProvider.parseDeliveryReport(body, headers);
    } catch {
      throw new ValidationError({ body: ['This delivery report could not be read.'] });
    }
    if (updates.length === 0) return { updated: 0 };
    const rows = (await dataSource.query(
      `UPDATE broadcast_recipients r
          SET status = x.state::recipient_status, error = x.error, status_at = now(), updated_at = now()
         FROM unnest($1::text[], $2::text[], $3::text[]) AS x(reference, state, error)
        WHERE r.provider_reference = x.reference AND r.status IN ('submitted', 'unknown')
        RETURNING r.broadcast_id AS "broadcastId"`,
      [
        updates.map((u) => u.providerReference),
        updates.map((u) => u.state),
        updates.map((u) => u.error),
      ],
    )) as [{ broadcastId: string }[], number];
    const broadcastIds = [...new Set(rows[0].map((row) => row.broadcastId))];
    for (const id of broadcastIds)
      await dataSource.transaction((manager) => refreshOutcome(id, manager));
    return { updated: rows[1] };
  },

  async requeueOutstanding(): Promise<number> {
    const rows = (await dataSource.query(
      `SELECT id, scheduled_at AS "scheduledAt" FROM broadcasts WHERE status IN ('scheduled', 'processing')`,
    )) as { id: string; scheduledAt: Date | null }[];
    for (const row of rows) enqueueDispatch(row.id, row.scheduledAt);
    return rows.length;
  },
};
