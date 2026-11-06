import { http, type RequestOptions } from '@/lib/api';

import type {
  AllocationRecipientsResponse,
  AllocationResponse,
  AllocationsResponse,
  CreateAllocationRequest,
  CreditBalancesResponse,
  CreditPurchasesResponse,
  CreditPricingResponse,
  CreditPurchaseResponse,
  CreditTransactionsResponse,
  CreateCreditPurchaseRequest,
  ListAllocationRecipientsParams,
  ListAllocationsParams,
  ListCreditPurchasesParams,
  ListCreditTransactionsParams,
} from '../types';

export const creditsEndpoints = {
  readBalances: (options?: RequestOptions) =>
    http.get<CreditBalancesResponse>('/credits/balance', options),

  readTransactions: (params: ListCreditTransactionsParams, options?: RequestOptions) =>
    http.get<CreditTransactionsResponse>('/credits/transactions', {
      ...options,
      params: { ...params, types: params.types?.join(',') },
    }),

  readPurchases: (params: ListCreditPurchasesParams, options?: RequestOptions) =>
    http.get<CreditPurchasesResponse>('/credits/purchases', { ...options, params }),

  createPurchase: (credentials: CreateCreditPurchaseRequest, options?: RequestOptions) =>
    http.post<CreditPurchaseResponse, CreateCreditPurchaseRequest>(
      '/credits/purchases',
      credentials,
      options,
    ),

  readAllocationRecipients: (params: ListAllocationRecipientsParams, options?: RequestOptions) =>
    http.get<AllocationRecipientsResponse>('/credits/allocation-recipients', {
      ...options,
      params,
    }),

  readAllocations: (params: ListAllocationsParams, options?: RequestOptions) =>
    http.get<AllocationsResponse>('/credits/allocations', { ...options, params }),

  createAllocation: (credentials: CreateAllocationRequest, options?: RequestOptions) =>
    http.post<AllocationResponse, CreateAllocationRequest>(
      '/credits/allocations',
      credentials,
      options,
    ),

  readPricing: (options?: RequestOptions) =>
    http.get<CreditPricingResponse>('/credits/pricing', options),
};
