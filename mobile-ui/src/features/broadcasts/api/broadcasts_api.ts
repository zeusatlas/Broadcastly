import { http, type RequestOptions } from '@/lib/api';

import type {
  BroadcastApiResponse,
  BroadcastEstimateResponse,
  BroadcastsResponse,
  CreateBroadcastRequest,
  DispatchBroadcastRequest,
  EstimateBroadcastRequest,
  ListBroadcastsParams,
  UpdateBroadcastRequest,
} from '../types';

export const broadcastsEndpoints = {
  createDraft: (credentials: CreateBroadcastRequest) =>
    http.post<BroadcastApiResponse, CreateBroadcastRequest>('/broadcasts', credentials),

  readBroadcasts: (params: ListBroadcastsParams, options?: RequestOptions) => {
    const query = {
      ...params,
      statuses: params.statuses?.join(','),
    };
    return http.get<BroadcastsResponse>('/broadcasts', { ...options, params: query });
  },

  readBroadcast: ({ broadcastId }: { broadcastId: string }, options?: RequestOptions) =>
    http.get<BroadcastApiResponse>(`/broadcasts/${broadcastId}`, options),

  estimateBroadcast: (credentials: EstimateBroadcastRequest, options?: RequestOptions) =>
    http.post<BroadcastEstimateResponse, EstimateBroadcastRequest>(
      '/broadcasts/estimate',
      credentials,
      options,
    ),

  submitBroadcast: ({
    broadcastId,
    credentials,
  }: {
    broadcastId: string;
    credentials: DispatchBroadcastRequest;
  }) =>
    http.post<BroadcastApiResponse, DispatchBroadcastRequest>(
      `/broadcasts/${broadcastId}/submit`,
      credentials,
    ),

  // The idempotency key travels as a header, so a retried send returns the same broadcast (FR-SMS-14).
  sendBroadcast: (
    { broadcastId, credentials }: { broadcastId: string; credentials: DispatchBroadcastRequest },
    options?: RequestOptions,
  ) =>
    http.post<BroadcastApiResponse, DispatchBroadcastRequest>(
      `/broadcasts/${broadcastId}/send`,
      credentials,
      options,
    ),

  updateDraft: ({
    broadcastId,
    credentials,
  }: {
    broadcastId: string;
    credentials: UpdateBroadcastRequest;
  }) =>
    http.patch<BroadcastApiResponse, UpdateBroadcastRequest>(
      `/broadcasts/${broadcastId}`,
      credentials,
    ),

  cancelBroadcast: ({ broadcastId }: { broadcastId: string }) =>
    http.post<BroadcastApiResponse>(`/broadcasts/${broadcastId}/cancel`),
};
