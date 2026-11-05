import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  CreateAllocationRequest,
  CreateCreditPurchaseRequest,
  ListAllocationRecipientsParams,
  ListAllocationsParams,
  ListCreditPurchasesParams,
  ListCreditTransactionsParams,
} from '../types';

export const useReadCreditBalancesQuery = () =>
  useQuery(['credits', 'balances'], (options) => api.credits.readBalances(options));

export const useReadCreditTransactionsQuery = (params: ListCreditTransactionsParams) =>
  useQuery(['credits', 'transactions', params], (options) =>
    api.credits.readTransactions(params, options),
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
