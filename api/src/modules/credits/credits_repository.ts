import type { EntityManager } from 'typeorm';

import { toSkipTake, type PageParams } from '../../common/http/pagination';
import type { DateRange } from '../../common/http/period';
import { dataSource } from '../../config/database';

import type { CreditPurchaseStatus, CreditTransactionType } from './credits_types';
import { CreditPurchase } from './entities/credit_purchase_entity';
import type { WalletOwner } from './ledger_service';

export interface WalletBalanceRow {
  id: string | null;
  balance: number;
  reserved: number;
}

export interface PurchaseRow {
  id: string;
  organisationId: string;
  organisationName: string;
  reference: string;
  credits: number;
  amountPesewas: number;
  status: CreditPurchaseStatus;
  provider: string;
  checkoutUrl: string | null;
  failureReason: string | null;
  initiatedBy: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
}

export interface TransactionRow {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  initiatedBy: string | null;
  purchaseId: string | null;
  broadcastId: string | null;
  createdAt: Date;
}

export interface PlatformTransactionRow extends TransactionRow {
  organisationId: string;
  organisationName: string;
}

export interface PurchaseFilters {
  organisationId?: string;
  status?: CreditPurchaseStatus;
  range: DateRange;
}

export interface PurchaseTotals {
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}

const EXECUTIVE_NAME = `(SELECT m.first_name || ' ' || m.last_name FROM organisation_executives e
                           JOIN members m ON m.id = e.member_id WHERE e.id = $COLUMN)`;
const executiveName = (column: string) => EXECUTIVE_NAME.replace('$COLUMN', column);

const PURCHASE_SELECT = `
  SELECT p.id, p.organisation_id AS "organisationId", o.name AS "organisationName", p.reference,
         p.credits, p.amount_pesewas AS "amountPesewas", p.status, p.provider,
         p.checkout_url AS "checkoutUrl", p.failure_reason AS "failureReason",
         ${executiveName('p.initiated_by_executive_id')} AS "initiatedBy",
         p.completed_at AS "completedAt", p.failed_at AS "failedAt", p.created_at AS "createdAt"
    FROM credit_purchases p JOIN organisations o ON o.id = p.organisation_id`;

// `column` is a code constant; values always travel as parameters.
function rangeClauses(column: string, range: DateRange, param: (value: unknown) => string) {
  const clauses: string[] = [];
  if (range.from) clauses.push(`${column} >= ${param(range.from)}`);
  if (range.to) clauses.push(`${column} < ${param(range.to)}`);
  return clauses;
}

// `inner` is a full query with "createdAt" and id columns; newest first.
async function paged<T>(inner: string, params: unknown[], page: PageParams) {
  const { skip, take } = toSkipTake(page);
  const n = params.length;
  const [rows, [counted]] = await Promise.all([
    dataSource.query(
      `SELECT * FROM (${inner}) listed ORDER BY "createdAt" DESC, id LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...params, take, skip],
    ) as Promise<T[]>,
    dataSource.query(`SELECT count(*)::int AS total FROM (${inner}) counted`, params) as Promise<
      { total: number }[]
    >,
  ]);
  return { rows, total: counted?.total ?? 0 };
}

export const creditsRepository = {
  async findWalletBalance(owner: WalletOwner): Promise<WalletBalanceRow> {
    const [row] = (await dataSource.query(
      owner.executiveId
        ? `SELECT id, balance, reserved FROM wallets WHERE executive_id = $1`
        : `SELECT id, balance, reserved FROM wallets
            WHERE organisation_id = $1 AND owner_type = 'organisation'`,
      [owner.executiveId ?? owner.organisationId],
    )) as WalletBalanceRow[];
    return row ?? { id: null, balance: 0, reserved: 0 };
  },

  findPurchaseByKey(organisationId: string, idempotencyKey: string, manager: EntityManager) {
    return manager.getRepository(CreditPurchase).findOneBy({ organisationId, idempotencyKey });
  },

  async insertPurchase(purchase: Partial<CreditPurchase>, manager: EntityManager) {
    const purchases = manager.getRepository(CreditPurchase);
    return purchases.save(purchases.create(purchase));
  },

  async updatePurchase(id: string, patch: Partial<CreditPurchase>, manager: EntityManager) {
    await manager.getRepository(CreditPurchase).update({ id }, patch);
  },

  lockPurchaseByReference(reference: string, manager: EntityManager) {
    return manager.getRepository(CreditPurchase).findOne({
      where: { reference },
      lock: { mode: 'pessimistic_write' },
    });
  },

  async findPurchase(id: string): Promise<PurchaseRow | null> {
    const [row] = (await dataSource.query(`${PURCHASE_SELECT} WHERE p.id = $1`, [
      id,
    ])) as PurchaseRow[];
    return row ?? null;
  },

  listPurchases({ organisationId, status, range }: PurchaseFilters, page: PageParams) {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = rangeClauses('p.created_at', range, param);
    if (organisationId) clauses.push(`p.organisation_id = ${param(organisationId)}`);
    if (status) clauses.push(`p.status = ${param(status)}`);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return paged<PurchaseRow>(`${PURCHASE_SELECT} ${where}`, params, page);
  },

  listTransactions(
    walletId: string,
    range: DateRange,
    page: PageParams,
    type?: CreditTransactionType,
  ) {
    const params: unknown[] = [walletId];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = ['t.wallet_id = $1', ...rangeClauses('t.created_at', range, param)];
    if (type) clauses.push(`t.type = ${param(type)}`);
    const select = `
      SELECT t.id, t.type, t.amount, t.balance_after AS "balanceAfter", t.reason,
             COALESCE(${executiveName('t.initiated_by_executive_id')},
                      (SELECT a.first_name || ' ' || a.last_name FROM platform_admins a
                        WHERE a.id = t.initiated_by_platform_admin_id)) AS "initiatedBy",
             t.purchase_id AS "purchaseId", t.broadcast_id AS "broadcastId",
             t.created_at AS "createdAt"
        FROM credit_transactions t`;
    return paged<TransactionRow>(`${select} WHERE ${clauses.join(' AND ')}`, params, page);
  },

  listPlatformTransactions(
    { organisationId, type, range }: { organisationId?: string; type?: CreditTransactionType; range: DateRange },
    page: PageParams,
  ) {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = ['w.owner_type = \'organisation\''];
    if (organisationId) clauses.push(`w.organisation_id = ${param(organisationId)}`);
    if (type) clauses.push(`t.type = ${param(type)}`);
    clauses.push(...rangeClauses('t.created_at', range, param));
    const where = clauses.join(' AND ');
    const select = `
      SELECT t.id, t.type, t.amount, t.balance_after AS "balanceAfter", t.reason,
             COALESCE(
               (SELECT a.first_name || ' ' || a.last_name FROM platform_admins a
                 WHERE a.id = t.initiated_by_platform_admin_id),
               ${executiveName('t.initiated_by_executive_id')}
             ) AS "initiatedBy",
             t.purchase_id AS "purchaseId", t.broadcast_id AS "broadcastId",
             t.created_at AS "createdAt", w.organisation_id AS "organisationId",
             o.name AS "organisationName"
        FROM credit_transactions t
        JOIN wallets w ON w.id = t.wallet_id
        JOIN organisations o ON o.id = w.organisation_id`;
    return paged<PlatformTransactionRow>(`${select} WHERE ${where}`, params, page);
  },

  async purchaseTotals(range: DateRange): Promise<PurchaseTotals> {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = rangeClauses('created_at', range, param);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [row] = (await dataSource.query(
      `SELECT COALESCE(sum(credits) FILTER (WHERE status = 'completed'), 0)::float8 AS "creditsPurchased",
              COALESCE(sum(amount_pesewas) FILTER (WHERE status = 'completed'), 0)::float8
                AS "amountPaidPesewas",
              count(*) FILTER (WHERE status = 'pending')::int AS "pendingPurchases",
              count(*) FILTER (WHERE status = 'failed')::int AS "failedPurchases"
         FROM credit_purchases ${where}`,
      params,
    )) as PurchaseTotals[];
    return row!;
  },
};
