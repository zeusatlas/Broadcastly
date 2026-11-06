import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  CreateBroadcastRequest,
  DispatchBroadcastRequest,
  BroadcastApiResponse,
  EstimateBroadcastRequest,
  ListBroadcastsParams,
  UpdateBroadcastRequest,
} from '../types';

export const useReadBroadcastsQuery = (params: ListBroadcastsParams) =>
  useQuery(['broadcasts', 'list', params], (options) =>
    api.broadcasts.readBroadcasts(params, options),
  );

export type BroadcastListFilters = Omit<ListBroadcastsParams, 'page' | 'pageSize' | 'search'>;

// The broadcasts tab: every page loaded so far for one search and set of filters.
export const useBroadcastPages = (search: string, filters: BroadcastListFilters = {}) =>
  usePages<BroadcastApiResponse>(
    `broadcasts:${search}:${JSON.stringify(filters)}`,
    (page, options) =>
      api.broadcasts.readBroadcasts(
        { ...filters, page, pageSize: PAGE_SIZE, search: search || undefined },
        options,
      ),
  );

export const useReadBroadcastQuery = (broadcastId: string) =>
  useQuery(
    ['broadcasts', 'detail', broadcastId],
    (options) => api.broadcasts.readBroadcast({ broadcastId }, options),
    { enabled: Boolean(broadcastId) },
  );

export const useCreateBroadcastDraftMutation = () =>
  useMutation((credentials: CreateBroadcastRequest) => api.broadcasts.createDraft(credentials));

// A read even though it is a POST: the key carries the whole payload, so any edit re-estimates.
export const useEstimateBroadcastQuery = (request: EstimateBroadcastRequest | null) =>
  useQuery(
    ['broadcasts', 'estimate', request],
    (options) => api.broadcasts.estimateBroadcast(request!, options),
    { enabled: request !== null },
  );

export const useSubmitBroadcastMutation = () =>
  useMutation((args: { broadcastId: string; credentials: DispatchBroadcastRequest }) =>
    api.broadcasts.submitBroadcast(args),
  );

export const useSendBroadcastMutation = () =>
  useMutation(
    ({
      idempotencyKey,
      ...args
    }: {
      broadcastId: string;
      credentials: DispatchBroadcastRequest;
      idempotencyKey: string;
    }) => api.broadcasts.sendBroadcast(args, { idempotencyKey }),
  );

export const useUpdateBroadcastDraftMutation = () =>
  useMutation((args: { broadcastId: string; credentials: UpdateBroadcastRequest }) =>
    api.broadcasts.updateDraft(args),
  );

export const useCancelBroadcastMutation = () => useMutation(api.broadcasts.cancelBroadcast);
