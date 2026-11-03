import type { PeriodParams } from '../../common/http/period';
import type { PageParams } from '../../common/http/pagination';

// An organisation's own wallet, or one executive's (FR-CR-01). Every executive wallet sits inside
// the organisation it belongs to.
export const WALLET_OWNER_TYPES = ['organisation', 'executive'] as const;
export type WalletOwnerType = (typeof WALLET_OWNER_TYPES)[number];

// Ledger entry kinds (FR-CR-06). The sign of `amount` says the direction, the type says why.
export const CREDIT_TRANSACTION_TYPES = [
  'purchase',
  'allocation_in',
  'allocation_out',
  'reservation',
  'release',
  'consumption',
  'refund',
  'reversal',
  'adjustment',
] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export const CREDIT_PURCHASE_STATUSES = ['pending', 'completed', 'failed'] as const;
export type CreditPurchaseStatus = (typeof CREDIT_PURCHASE_STATUSES)[number];

export interface WalletBalanceResponse {
  balance: number;
  reserved: number;
  available: number;
}

export interface CreditBalancesResponse {
  organisation: WalletBalanceResponse | null;
  mine: WalletBalanceResponse;
}

export interface CreatePurchaseRequest {
  credits: number;
}

export interface PurchaseResponse {
  id: string;
  organisationId: string;
  organisationName: string;
  reference: string;
  credits: number;
  amountPesewas: number;
  currency: 'GHS';
  status: CreditPurchaseStatus;
  provider: string;
  // Where the buyer pays; null when the provider needs no redirect (the dev driver).
  checkoutUrl: string | null;
  failureReason: string | null;
  initiatedBy: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
}

export interface ListPurchasesRequest extends PageParams, PeriodParams {
  status?: CreditPurchaseStatus;
}

export interface CreditTransactionResponse {
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

export interface ListCreditTransactionsRequest extends PageParams, PeriodParams {
  wallet: 'mine' | 'organisation';
}

// The dev payment driver's webhook body. Real providers post their own format (SRS 6.5).
export interface SimulatedPaymentEvent {
  reference: string;
  outcome: 'paid' | 'failed';
  reason?: string;
}

export interface LedgerEntryInput {
  walletId: string;
  type: CreditTransactionType;
  amount: number;
  // Unique per movement, so a retried request or replayed webhook never moves credits twice.
  idempotencyKey: string;
  reason?: string | null;
  initiatedByExecutiveId?: string | null;
  initiatedByPlatformAdminId?: string | null;
  purchaseId?: string | null;
  broadcastId?: string | null;
}
