import type { EntityManager } from 'typeorm';

import { toSkipTake, type PageParams } from '../../common/http/pagination';
import type { DateRange } from '../../common/http/period';
import { dataSource } from '../../config/database';
import type { ExecutiveStatus } from '../auth';
import { CHAIRMAN_POSITION_ID } from '../organisation';

import type {
  AllocationRecipientPosition,
  CreditPurchaseStatus,
  CreditTransactionType,
} from './credits_types';
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
  walletOwner: string | null;
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

export interface AllocationRow {
  id: string;
  executiveId: string;
  executiveName: string;
  credits: number;
  reason: string | null;
  initiatedBy: string | null;
  createdAt: Date;
}

export interface AllocationTarget {
  id: string;
  status: ExecutiveStatus;
  holdsChairman: boolean;
  inReach: boolean;
}

export interface AllocationRecipientRow {
  id: string;
  name: string;
  positions: AllocationRecipientPosition[];
  balance: number;
  reserved: number;
}

export type Scope = readonly string[] | null;

const EXECUTIVE_NAME = `(SELECT m.first_name || ' ' || m.last_name FROM organisation_executives e
                           JOIN members m ON m.id = e.member_id WHERE e.id = $COLUMN)`;
const executiveName = (column: string) => EXECUTIVE_NAME.replace('$COLUMN', column);

const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;

const inReach = (memberColumn: string, scopeParam: string) =>
  `EXISTS (SELECT 1 FROM appointments sa WHERE sa.member_id = ${memberColumn}
            AND sa.status = 'active' AND sa.unit_id = ANY(${scopeParam}::uuid[]))`;

// One allocation = an allocation_out row on the giver's wallet plus its allocation_in twin,
// paired through their keys (`<base>:out` / `<base>:in`), so no extra table is needed.
const ALLOCATION_SELECT = `
  SELECT o.id, w.executive_id AS "executiveId", ${executiveName('w.executive_id')} AS "executiveName",
         -o.amount AS credits, o.reason,
         ${executiveName('o.initiated_by_executive_id')} AS "initiatedBy", o.created_at AS "createdAt"
    FROM credit_transactions o
    JOIN credit_transactions i ON i.idempotency_key = left(o.idempotency_key, -4) || ':in'
    JOIN wallets w ON w.id = i.wallet_id`;

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

  // Every executive's wallet in the organisation, added up.
  async findOrganisationTotals(organisationId: string) {
    const [row] = (await dataSource.query(
      `SELECT COALESCE(SUM(balance), 0)::int AS balance, COALESCE(SUM(reserved), 0)::int AS reserved
         FROM wallets WHERE organisation_id = $1`,
      [organisationId],
    )) as { balance: number; reserved: number }[];
    return row ?? { balance: 0, reserved: 0 };
  },

  async findHeadExecutiveId(organisationId: string, manager: EntityManager) {
    const [row] = (await manager.query(
      `SELECT e.id FROM organisation_executives e
         JOIN appointments a ON a.member_id = e.member_id AND a.status = 'active'
        WHERE e.organisation_id = $1 AND a.position_id = $2 LIMIT 1`,
      [organisationId, CHAIRMAN_POSITION_ID],
    )) as { id: string }[];
    return row?.id ?? null;
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
    of: { walletId: string } | { organisationId: string },
    range: DateRange,
    page: PageParams,
    types?: CreditTransactionType[],
  ) {
    const params: unknown[] = ['walletId' in of ? of.walletId : of.organisationId];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = [
      'walletId' in of ? 't.wallet_id = $1' : 'tw.organisation_id = $1',
      ...rangeClauses('t.created_at', range, param),
    ];
    if (types?.length) clauses.push(`t.type::text = ANY(${param(types)}::text[])`);
    const select = `
      SELECT t.id, t.type, t.amount, t.balance_after AS "balanceAfter", t.reason,
             COALESCE(${executiveName('t.initiated_by_executive_id')},
                      (SELECT a.first_name || ' ' || a.last_name FROM platform_admins a
                        WHERE a.id = t.initiated_by_platform_admin_id)) AS "initiatedBy",
             t.purchase_id AS "purchaseId", t.broadcast_id AS "broadcastId",
             t.created_at AS "createdAt", ${executiveName('tw.executive_id')} AS "walletOwner"
        FROM credit_transactions t JOIN wallets tw ON tw.id = t.wallet_id`;
    return paged<TransactionRow>(`${select} WHERE ${clauses.join(' AND ')}`, params, page);
  },

  listPlatformTransactions(
    {
      organisationId,
      type,
      range,
    }: { organisationId?: string; type?: CreditTransactionType; range: DateRange },
    page: PageParams,
  ) {
    const params: unknown[] = [];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = ["w.owner_type = 'organisation'"];
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
             o.name AS "organisationName", ${executiveName('w.executive_id')} AS "walletOwner"
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

  // FOR SHARE: a suspension of this executive waits until the allocation commits.
  async findAllocationTarget(
    organisationId: string,
    executiveId: string,
    scope: Scope,
    manager: EntityManager,
  ): Promise<AllocationTarget | null> {
    const [row] = (await manager.query(
      `SELECT e.id, e.status,
              EXISTS (SELECT 1 FROM appointments a WHERE a.member_id = e.member_id
                       AND a.status = 'active' AND a.position_id = $3) AS "holdsChairman",
              ${scope ? inReach('e.member_id', '$4') : 'true'} AS "inReach"
         FROM organisation_executives e
        WHERE e.organisation_id = $1 AND e.id = $2
          FOR SHARE`,
      scope
        ? [organisationId, executiveId, CHAIRMAN_POSITION_ID, scope]
        : [organisationId, executiveId, CHAIRMAN_POSITION_ID],
    )) as AllocationTarget[];
    return row ?? null;
  },

  async findAllocationByKey(outKey: string, manager: EntityManager): Promise<AllocationRow | null> {
    const [row] = (await manager.query(
      `${ALLOCATION_SELECT} WHERE o.idempotency_key = $1 AND o.type = 'allocation_out'`,
      [outKey],
    )) as AllocationRow[];
    return row ?? null;
  },

  listAllocations(organisationId: string, scope: Scope, range: DateRange, page: PageParams) {
    const params: unknown[] = [organisationId];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = [
      'w.organisation_id = $1',
      `o.type = 'allocation_out'`,
      ...rangeClauses('o.created_at', range, param),
    ];
    if (scope) {
      const scopeParam = param(scope);
      clauses.push(`EXISTS (SELECT 1 FROM organisation_executives re WHERE re.id = w.executive_id
                     AND ${inReach('re.member_id', scopeParam)})`);
    }
    return paged<AllocationRow>(
      `${ALLOCATION_SELECT} WHERE ${clauses.join(' AND ')}`,
      params,
      page,
    );
  },

  // Active executives the caller may allocate to: in reach and never themselves.
  async listAllocationRecipients(
    organisationId: string,
    callerExecutiveId: string,
    scope: Scope,
    search: string | undefined,
    page: PageParams,
  ) {
    const params: unknown[] = [organisationId, callerExecutiveId];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = ['e.organisation_id = $1', `e.status = 'active'`, 'e.id <> $2'];
    if (scope) clauses.push(inReach('e.member_id', param(scope)));
    if (search) {
      const p = param(likePattern(search));
      clauses.push(`(m.first_name || ' ' || m.last_name ILIKE ${p} OR m.member_number ILIKE ${p})`);
    }
    const from = `FROM organisation_executives e JOIN members m ON m.id = e.member_id
                  WHERE ${clauses.join(' AND ')}`;
    const { skip, take } = toSkipTake(page);
    const n = params.length;
    const [rows, [counted]] = await Promise.all([
      dataSource.query(
        `SELECT e.id, e.first_name || ' ' || e.last_name AS name,
                COALESCE((SELECT json_agg(json_build_object('title', p.title, 'unitName', u.name)
                                          ORDER BY a.effective_from)
                            FROM appointments a
                            JOIN positions p ON p.id = a.position_id
                            LEFT JOIN organisation_units u ON u.id = a.unit_id
                           WHERE a.member_id = e.member_id AND a.status = 'active'), '[]') AS positions,
                COALESCE(w.balance, 0) AS balance, COALESCE(w.reserved, 0) AS reserved
           FROM (SELECT e.id, e.member_id, m.first_name, m.last_name ${from}
                  ORDER BY m.first_name, m.last_name, e.id
                  LIMIT $${n + 1} OFFSET $${n + 2}) e
           LEFT JOIN wallets w ON w.executive_id = e.id
          ORDER BY e.first_name, e.last_name, e.id`,
        [...params, take, skip],
      ) as Promise<AllocationRecipientRow[]>,
      dataSource.query(`SELECT count(*)::int AS total ${from}`, params) as Promise<
        { total: number }[]
      >,
    ]);
    return { rows, total: counted?.total ?? 0 };
  },
};
