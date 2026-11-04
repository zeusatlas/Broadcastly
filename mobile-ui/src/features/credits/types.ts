// Ledger entry kinds the SRS names (FR-CR-06); allocations split by direction for display.
export type CreditTransactionType =
  | 'purchase'
  | 'allocation_in'
  | 'allocation_out'
  | 'reservation'
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
  initiatedBy: string;
}

export interface CreditSummary {
  available: number;
  reserved: number;
  spendingLimit: number | null;
  spentThisPeriod: number;
}
