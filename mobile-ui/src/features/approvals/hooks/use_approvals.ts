import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type { ApprovalBroadcastResponse, ApprovalFilter } from '../types';

export const useApprovalPages = (filter: ApprovalFilter, search: string) =>
  usePages<ApprovalBroadcastResponse>(`approvals:${filter}:${search}`, (page, options) =>
    api.approvals.readApprovals(
      { page, pageSize: PAGE_SIZE, status: filter, search: search || undefined },
      options,
    ),
  );

export const useReadApprovalQuery = (broadcastId: string | null) =>
  useQuery(
    ['approvals', 'detail', broadcastId],
    (options) => api.approvals.readApproval({ broadcastId: broadcastId ?? '' }, options),
    { enabled: broadcastId !== null },
  );

export const useApproveBroadcastMutation = () => useMutation(api.approvals.approveBroadcast);

export const useRejectBroadcastMutation = () => useMutation(api.approvals.rejectBroadcast);
