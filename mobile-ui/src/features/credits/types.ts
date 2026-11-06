import type { PageParams, Paginated } from '@/types/api';

// Ledger entry kinds the SRS names (FR-CR-06); allocations split by direction for display.
export type CreditTransactionType =
  | 'purchase'
  | 'allocation_in'
  | 'allocation_out'
  | 'reservation'
  | 'release'
  | 'consumption'
  | 'refund'
  | 'reversal'
  | 'adjustment';

// One ledger row as the list shows it (FR-CR-07). Replaced by the API's response once mounted.
export interface CreditTransaction {
  id: string;
  type: CreditTransactionType;
  title: string;
  // Signed: positive adds to the balance, negative takes from it.
  amount: number;
  occurredAt: string;
  createdAt: string;
  initiatedBy: string;
}

export interface CreditSummary {
  available: number;
  reserved: number;
  spendingLimit: number | null;
  spentThisPeriod: number;
}

export type CreditPeriod =
  | 'today'
  | 'yesterday'
  | 'last_3_days'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_365_days'
  | 'all_time'
  | 'custom';

export interface CreditPeriodParams {
  period?: CreditPeriod;
  from?: string;
  to?: string;
}

export interface ListCreditTransactionsParams extends PageParams, CreditPeriodParams {
  wallet: 'mine' | 'organisation';
  type?: CreditTransactionType;
  types?: CreditTransactionType[];
}

export interface ListCreditPurchasesParams extends PageParams, CreditPeriodParams {
  status?: 'pending' | 'completed' | 'failed';
}

export interface CreditWalletResponse {
  balance: number;
  reserved: number;
  available: number;
}

export interface CreditBalancesResponse {
  // Every executive's credits added up; null unless you may see the organisation's credits.
  organisation: CreditWalletResponse | null;
  organisationTotal: CreditWalletResponse | null;
  mine: CreditWalletResponse;
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
  createdAt: string;
  // Whose credits the row moved; set in the organisation-wide history.
  walletOwner: string | null;
}

export interface CreateCreditPurchaseRequest {
  credits: number;
}

export interface CreditPurchaseResponse {
  id: string;
  organisationId: string;
  organisationName: string;
  reference: string;
  credits: number;
  amountPesewas: number;
  currency: 'GHS';
  status: 'pending' | 'completed' | 'failed';
  provider: string;
  checkoutUrl: string | null;
  failureReason: string | null;
  initiatedBy: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export type CreditTransactionsResponse = Paginated<CreditTransactionResponse>;
export type CreditPurchasesResponse = Paginated<CreditPurchaseResponse>;

export interface CreateAllocationRequest {
  executiveId: string;
  credits: number;
  reason?: string;
}

export interface AllocationResponse {
  id: string;
  executiveId: string;
  executiveName: string;
  credits: number;
  reason: string | null;
  initiatedBy: string | null;
  createdAt: string;
}

export interface AllocationRecipientPosition {
  title: string;
  unitName: string | null;
}

export interface AllocationRecipientResponse {
  id: string;
  name: string;
  positions: AllocationRecipientPosition[];
  wallet: CreditWalletResponse;
}

export interface ListAllocationRecipientsParams extends PageParams {
  search?: string;
}

export interface ListAllocationsParams extends PageParams, CreditPeriodParams {}

export type AllocationsResponse = Paginated<AllocationResponse>;
export type AllocationRecipientsResponse = Paginated<AllocationRecipientResponse>;

export interface CreditPricingResponse {
  pricePesewasPerCredit: number;
  currency: 'GHS';
}
