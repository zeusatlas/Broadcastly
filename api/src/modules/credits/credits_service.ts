import { randomBytes } from 'node:crypto';

import { QueryFailedError } from 'typeorm';

import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/app_error';
import { toPaginated, type Paginated } from '../../common/http/pagination';
import { resolvePeriod, type PeriodParams } from '../../common/http/period';
import { dataSource } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { paymentProvider, type PaymentEvent } from '../../integrations/payments/payment_provider';
import { AUDIT_ACTIONS, auditService } from '../audit';
import { auditActor, type AccessContext, type ActionActor } from '../auth';
import { organisationService } from '../organisation';

import {
  toPlatformTransactionResponse,
  toPurchaseResponse,
  toTransactionResponse,
  toWalletBalance,
} from './credits_mapper';
import { creditsRepository, type PurchaseTotals } from './credits_repository';
import type {
  CreatePurchaseRequest,
  CreditBalancesResponse,
  CreditTransactionResponse,
  CreditTransactionType,
  PlatformCreditTransactionResponse,
  ListCreditTransactionsRequest,
  ListPurchasesRequest,
  PurchaseResponse,
  WalletBalanceResponse,
} from './credits_types';
import { ledgerService } from './ledger_service';
import { CreditTransaction } from './entities/credit_transaction_entity';

const PURCHASE_NOT_FOUND = 'Purchase not found.';
const UNIQUE_VIOLATION = '23505';

const newReference = () => `BCP-${randomBytes(6).toString('hex').toUpperCase()}`;

// Executives act inside their own organisation only; platform admins use platformService instead.
function executiveOf(auth: AccessContext) {
  if (auth.kind !== 'executive' || !auth.organisationId) {
    throw new ForbiddenError('Only an organisation’s executives can do that.');
  }
  return { organisationId: auth.organisationId, executiveId: auth.accountId };
}

const seesOrganisationWallet = (auth: AccessContext) =>
  auth.permissions.has('credit.purchase') || auth.permissions.has('credit.allocate');

export const creditsService = {
  // Everyone sees their own wallet (FR-CR-10); the organisation's only with a credit permission.
  async getBalances(auth: AccessContext): Promise<CreditBalancesResponse> {
    const { organisationId, executiveId } = executiveOf(auth);
    const [mine, organisation] = await Promise.all([
      creditsRepository.findWalletBalance({ organisationId, executiveId }),
      seesOrganisationWallet(auth) ? creditsRepository.findWalletBalance({ organisationId }) : null,
    ]);
    return {
      mine: toWalletBalance(mine),
      organisation: organisation && toWalletBalance(organisation),
    };
  },

  async getOrganisationBalance(organisationId: string): Promise<WalletBalanceResponse> {
    return toWalletBalance(await creditsRepository.findWalletBalance({ organisationId }));
  },

  // Saved as pending first; the provider is called after commit so no lock waits on the network.
  async createPurchase(
    auth: AccessContext,
    { credits }: CreatePurchaseRequest,
    idempotencyKey: string | null,
    actor: ActionActor,
  ): Promise<PurchaseResponse> {
    const { organisationId, executiveId } = executiveOf(auth);

    let purchase;
    try {
      purchase = await dataSource.transaction(async (manager) => {
        if (idempotencyKey) {
          const existing = await creditsRepository.findPurchaseByKey(
            organisationId,
            idempotencyKey,
            manager,
          );
          if (existing) return { ...existing, isNew: false };
        }

        const wallet = await ledgerService.walletFor({ organisationId }, manager);
        const created = await creditsRepository.insertPurchase(
          {
            organisationId,
            walletId: wallet.id,
            credits,
            amountPesewas: credits * env.CREDIT_PRICE_PESEWAS,
            provider: paymentProvider.name,
            reference: newReference(),
            idempotencyKey,
            initiatedByExecutiveId: executiveId,
          },
          manager,
        );
        await auditService.record(
          {
            action: AUDIT_ACTIONS.creditPurchaseStarted,
            targetType: 'credit_purchase',
            targetId: created.id,
            metadata: { organisationId, credits, amountPesewas: created.amountPesewas },
            ...auditActor(actor),
          },
          manager,
        );
        return { ...created, isNew: true };
      });
    } catch (error) {
      // Two identical requests raced; the unique index kept one, so return that one.
      if (
        idempotencyKey &&
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        const winner = await dataSource.manager.transaction((manager) =>
          creditsRepository.findPurchaseByKey(organisationId, idempotencyKey, manager),
        );
        if (winner) return creditsService.getPurchase(winner.id);
      }
      throw error;
    }

    if (purchase.isNew) {
      try {
        const { checkoutUrl } = await paymentProvider.initiate({
          reference: purchase.reference,
          amountPesewas: purchase.amountPesewas,
          currency: 'GHS',
          description: `${purchase.credits} SMS credits`,
        });
        if (checkoutUrl) {
          await creditsRepository.updatePurchase(purchase.id, { checkoutUrl }, dataSource.manager);
        }
      } catch (error) {
        logger.error({ err: error, purchaseId: purchase.id }, 'Payment could not be started.');
        await creditsService.settlePayment({
          reference: purchase.reference,
          outcome: 'failed',
          reason: 'The payment could not be started.',
        });
      }
    }
    return creditsService.getPurchase(purchase.id);
  },

  async getPurchase(id: string): Promise<PurchaseResponse> {
    const row = await creditsRepository.findPurchase(id);
    if (!row) throw new NotFoundError(PURCHASE_NOT_FOUND);
    return toPurchaseResponse(row);
  },

  async listPurchases(
    filter: { organisationId?: string },
    { page, pageSize, status, ...period }: ListPurchasesRequest,
  ): Promise<Paginated<PurchaseResponse>> {
    const { rows, total } = await creditsRepository.listPurchases(
      { ...filter, status, range: resolvePeriod(period) },
      { page, pageSize },
    );
    return toPaginated(rows.map(toPurchaseResponse), total, { page, pageSize });
  },

  listOwnPurchases(auth: AccessContext, query: ListPurchasesRequest) {
    return creditsService.listPurchases(
      { organisationId: executiveOf(auth).organisationId },
      query,
    );
  },

  async listTransactions(
    auth: AccessContext,
    { wallet, type, page, pageSize, ...period }: ListCreditTransactionsRequest,
  ): Promise<Paginated<CreditTransactionResponse>> {
    const { organisationId, executiveId } = executiveOf(auth);
    if (wallet === 'organisation' && !seesOrganisationWallet(auth)) {
      throw new ForbiddenError('You do not have permission to see the organisation’s credits.');
    }
    const owner = wallet === 'organisation' ? { organisationId } : { organisationId, executiveId };
    return creditsService.listWalletTransactions(owner, period, { page, pageSize }, type);
  },

  async listWalletTransactions(
    owner: { organisationId: string; executiveId?: string },
    period: PeriodParams,
    page: { page: number; pageSize: number },
    type?: CreditTransactionType,
  ): Promise<Paginated<CreditTransactionResponse>> {
    const wallet = await creditsRepository.findWalletBalance(owner);
    if (!wallet.id) return toPaginated([], 0, page);
    const { rows, total } = await creditsRepository.listTransactions(
      wallet.id,
      resolvePeriod(period),
      page,
      type,
    );
    return toPaginated(rows.map(toTransactionResponse), total, page);
  },

  async listPlatformTransactions(
    {
      page,
      pageSize,
      period,
      from,
      to,
      organisationId,
      type,
    }: {
      page: number;
      pageSize: number;
      period: PeriodParams['period'];
      from?: string;
      to?: string;
      organisationId?: string;
      type?: CreditTransactionType;
    },
  ): Promise<Paginated<PlatformCreditTransactionResponse>> {
    const { rows, total } = await creditsRepository.listPlatformTransactions(
      { organisationId, type, range: resolvePeriod({ period, from, to }) },
      { page, pageSize },
    );
    return toPaginated(rows.map(toPlatformTransactionResponse), total, { page, pageSize });
  },

  async createPlatformAdjustment(
    input: { organisationId: string; amount: number; reason: string },
    idempotencyKey: string,
    actor: ActionActor,
  ): Promise<CreditTransactionResponse> {
    const transaction = await dataSource.transaction(async (manager) => {
      const organisation = await organisationService.lockOrganisation(input.organisationId, manager);
      if (!organisation) throw new NotFoundError('Organisation not found.');
      const wallet = await ledgerService.walletFor({ organisationId: input.organisationId }, manager);
      const existing = await manager.getRepository(CreditTransaction).findOneBy({ idempotencyKey });
      if (existing) {
        if (existing.walletId !== wallet.id || existing.amount !== input.amount || existing.reason !== input.reason) {
          throw new ValidationError({}, 'This Idempotency-Key was already used for another adjustment.');
        }
        return existing;
      }
      const posted = await ledgerService.post(
        {
          walletId: wallet.id,
          type: 'adjustment',
          amount: input.amount,
          idempotencyKey,
          reason: input.reason,
          initiatedByPlatformAdminId: actor.platformAdminId ?? null,
        },
        manager,
      );
      await auditService.record(
        {
          action: AUDIT_ACTIONS.creditAdjusted,
          targetType: 'credit_transaction',
          targetId: posted.id,
          metadata: { organisationId: input.organisationId, amount: input.amount },
          ...auditActor(actor),
        },
        manager,
      );
      return posted;
    });
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      reason: transaction.reason,
      initiatedBy: null,
      purchaseId: transaction.purchaseId,
      broadcastId: transaction.broadcastId,
      createdAt: transaction.createdAt,
    };
  },

  purchaseTotals(period: PeriodParams): Promise<PurchaseTotals> {
    return creditsRepository.purchaseTotals(resolvePeriod(period));
  },

  // Settles a purchase exactly once: a replayed or late webhook for a settled purchase changes nothing.
  async settlePayment(event: PaymentEvent): Promise<void> {
    await dataSource.transaction(async (manager) => {
      const purchase = await creditsRepository.lockPurchaseByReference(event.reference, manager);
      if (!purchase) throw new NotFoundError(PURCHASE_NOT_FOUND);
      if (purchase.status !== 'pending') return;

      if (event.outcome === 'paid') {
        await ledgerService.post(
          {
            walletId: purchase.walletId,
            type: 'purchase',
            amount: purchase.credits,
            idempotencyKey: `purchase:${purchase.id}`,
            reason: `Purchase ${purchase.reference}`,
            initiatedByExecutiveId: purchase.initiatedByExecutiveId,
            purchaseId: purchase.id,
          },
          manager,
        );
        await creditsRepository.updatePurchase(
          purchase.id,
          { status: 'completed', completedAt: new Date() },
          manager,
        );
      } else {
        await creditsRepository.updatePurchase(
          purchase.id,
          {
            status: 'failed',
            failedAt: new Date(),
            failureReason: event.reason ?? 'The payment did not go through.',
          },
          manager,
        );
      }

      await auditService.record(
        {
          action:
            event.outcome === 'paid'
              ? AUDIT_ACTIONS.creditPurchaseCompleted
              : AUDIT_ACTIONS.creditPurchaseFailed,
          targetType: 'credit_purchase',
          targetId: purchase.id,
          metadata: { organisationId: purchase.organisationId, credits: purchase.credits },
        },
        manager,
      );
    });
  },

  handleWebhook(headers: Record<string, unknown>, body: unknown): Promise<void> {
    const event = paymentProvider.parseWebhook(headers, body);
    if (!event) throw new ValidationError({}, 'This is not a valid payment notification.');
    return creditsService.settlePayment(event);
  },
};
