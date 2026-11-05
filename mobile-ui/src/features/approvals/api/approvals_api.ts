import { http, type RequestOptions } from '@/lib/api';
import type { Paginated } from '@/types/api';

import type {
  ApprovalBroadcastResponse,
  ApprovalDetailResponse,
  ApproveBroadcastRequest,
  ListApprovalsParams,
  RejectBroadcastRequest,
} from '../types';

export const approvalsEndpoints = {
  readApprovals: (params: ListApprovalsParams, options?: RequestOptions) =>
    http.get<Paginated<ApprovalBroadcastResponse>>('/approvals', { ...options, params }),

  readApproval: ({ broadcastId }: { broadcastId: string }, options?: RequestOptions) =>
    http.get<ApprovalDetailResponse>(`/approvals/${broadcastId}`, options),

  approveBroadcast: ({
    broadcastId,
    credentials,
  }: {
    broadcastId: string;
    credentials: ApproveBroadcastRequest;
  }) =>
    http.post<ApprovalBroadcastResponse, ApproveBroadcastRequest>(
      `/approvals/${broadcastId}/approve`,
      credentials,
    ),

  rejectBroadcast: ({
    broadcastId,
    credentials,
  }: {
    broadcastId: string;
    credentials: RejectBroadcastRequest;
  }) =>
    http.post<ApprovalBroadcastResponse, RejectBroadcastRequest>(
      `/approvals/${broadcastId}/reject`,
      credentials,
    ),
};
