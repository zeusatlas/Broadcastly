import { http, type RequestOptions } from '@/lib/api';

import type {
  CreditBalancesResponse,
  CreditPurchasesResponse,
  CreditPurchaseResponse,
  CreditTransactionsResponse,
  CreateCreditPurchaseRequest,
  ListCreditPurchasesParams,
  ListCreditTransactionsParams,
} from '../types';

export const creditsEndpoints = {
  readBalances: (options?: RequestOptions) =>
    http.get<CreditBalancesResponse>('/credits/balance', options),

  readTransactions: (params: ListCreditTransactionsParams, options?: RequestOptions) =>
    http.get<CreditTransactionsResponse>('/credits/transactions', { ...options, params }),

  readPurchases: (params: ListCreditPurchasesParams, options?: RequestOptions) =>
    http.get<CreditPurchasesResponse>('/credits/purchases', { ...options, params }),

  createPurchase: (
    credentials: CreateCreditPurchaseRequest,
    options?: RequestOptions,
  ) => http.post<CreditPurchaseResponse, CreateCreditPurchaseRequest>('/credits/purchases', credentials, options),
};
