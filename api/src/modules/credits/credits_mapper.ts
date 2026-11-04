import type {
  CreditTransactionResponse,
  PurchaseResponse,
  WalletBalanceResponse,
} from './credits_types';
import type { PurchaseRow, TransactionRow, WalletBalanceRow } from './credits_repository';

export const toWalletBalance = ({
  balance,
  reserved,
}: WalletBalanceRow): WalletBalanceResponse => ({
  balance,
  reserved,
  available: balance - reserved,
});

export const toPurchaseResponse = (row: PurchaseRow): PurchaseResponse => ({
  ...row,
  currency: 'GHS',
});

export const toTransactionResponse = (row: TransactionRow): CreditTransactionResponse => row;
