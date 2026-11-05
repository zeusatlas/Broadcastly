import type {
  AllocationRecipientResponse,
  AllocationResponse,
  CreditTransactionResponse,
  PlatformCreditTransactionResponse,
  PurchaseResponse,
  WalletBalanceResponse,
} from './credits_types';
import type {
  AllocationRecipientRow,
  AllocationRow,
  PlatformTransactionRow,
  PurchaseRow,
  TransactionRow,
  WalletBalanceRow,
} from './credits_repository';

export const toWalletBalance = ({
  balance,
  reserved,
}: Pick<WalletBalanceRow, 'balance' | 'reserved'>): WalletBalanceResponse => ({
  balance,
  reserved,
  available: balance - reserved,
});

export const toPurchaseResponse = (row: PurchaseRow): PurchaseResponse => ({
  ...row,
  currency: 'GHS',
});

export const toTransactionResponse = (row: TransactionRow): CreditTransactionResponse => row;

export const toPlatformTransactionResponse = (
  row: PlatformTransactionRow,
): PlatformCreditTransactionResponse => row;

export const toAllocationResponse = (row: AllocationRow): AllocationResponse => row;

export const toAllocationRecipientResponse = ({
  id,
  name,
  positions,
  balance,
  reserved,
}: AllocationRecipientRow): AllocationRecipientResponse => ({
  id,
  name,
  positions,
  wallet: toWalletBalance({ balance, reserved }),
});
