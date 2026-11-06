import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  CreateAllocationRequest,
  CreateCreditPurchaseRequest,
  ListAllocationRecipientsParams,
  ListAllocationsParams,
  ListCreditPurchasesParams,
  ListCreditTransactionsParams,
  AllocationResponse,
  CreditTransactionResponse,
  CreditTransactionType,
} from '../types';

export const useReadCreditBalancesQuery = () =>
  useQuery(['credits', 'balances'], (options) => api.credits.readBalances(options));

export const useReadCreditTransactionsQuery = (params: ListCreditTransactionsParams) =>
  useQuery(['credits', 'transactions', params], (options) =>
    api.credits.readTransactions(params, options),
  );

// The history list: every page loaded so far for one wallet and one set of kinds.
export const useCreditTransactionPages = (
  wallet: 'mine' | 'organisation',
  types?: CreditTransactionType[],
) =>
  usePages<CreditTransactionResponse>(
    `credit-transactions:${wallet}:${types?.join(',') ?? ''}`,
    (page, options) =>
      api.credits.readTransactions({ page, pageSize: PAGE_SIZE, wallet, types }, options),
  );

export const useAllocationPages = (isEnabled: boolean) =>
  usePages<AllocationResponse>(`credit-allocations:${isEnabled}`, (page, options) =>
    isEnabled
      ? api.credits.readAllocations({ page, pageSize: PAGE_SIZE }, options)
      : Promise.resolve({
          status: 'success',
          status_code: 200,
          message: '',
          data: { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, hasNextPage: false },
        }),
  );

export const useReadCreditPurchasesQuery = (params: ListCreditPurchasesParams) =>
  useQuery(['credits', 'purchases', params], (options) =>
    api.credits.readPurchases(params, options),
  );

export const useCreateCreditPurchaseMutation = () =>
  useMutation(
    (args: { credentials: CreateCreditPurchaseRequest; options?: { idempotencyKey: string } }) =>
      api.credits.createPurchase(args.credentials, args.options),
  );

export const useReadAllocationRecipientsQuery = (params: ListAllocationRecipientsParams) =>
  useQuery(['credits', 'allocation-recipients', params], (options) =>
    api.credits.readAllocationRecipients(params, options),
  );

export const useReadAllocationsQuery = (
  params: ListAllocationsParams,
  { enabled = true }: { enabled?: boolean } = {},
) =>
  useQuery(
    ['credits', 'allocations', params],
    (options) => api.credits.readAllocations(params, options),
    {
      enabled,
    },
  );

export const useCreateAllocationMutation = () =>
  useMutation(
    (args: { credentials: CreateAllocationRequest; options: { idempotencyKey: string } }) =>
      api.credits.createAllocation(args.credentials, args.options),
  );

export const useReadCreditPricingQuery = () =>
  useQuery(['credits', 'pricing'], (options) => api.credits.readPricing(options));
