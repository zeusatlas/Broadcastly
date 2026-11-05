import * as Sharing from 'expo-sharing';

import type { BroadcastStatus } from '@/features/broadcasts';
import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { api } from '@/lib/api/apiSlice';

import type {
  DeliveryResponse,
  DeliveryStatus,
  ReportBroadcastResponse,
  ReportFilter,
} from '../types';

const REPORT_STATUSES: Record<ReportFilter, BroadcastStatus[]> = {
  all: ['processing', 'submitted', 'completed', 'partially_failed', 'failed'],
  sending: ['processing', 'submitted'],
  completed: ['completed'],
  partially_failed: ['partially_failed'],
  failed: ['failed'],
};

export const useReportPages = (filter: ReportFilter, search: string) =>
  usePages<ReportBroadcastResponse>(`reports:${filter}:${search}`, (page, options) =>
    api.reports.readReports(
      {
        page,
        pageSize: PAGE_SIZE,
        statuses: REPORT_STATUSES[filter],
        search: search || undefined,
      },
      options,
    ),
  );

export const useDeliveryPages = (broadcastId: string, status: DeliveryStatus | 'all') =>
  usePages<DeliveryResponse>(`deliveries:${broadcastId}:${status}`, (page, options) =>
    api.reports.readDeliveries(
      {
        broadcastId,
        params: { page, pageSize: PAGE_SIZE, status: status === 'all' ? undefined : status },
      },
      options,
    ),
  );

export const useExportReportMutation = () =>
  useMutation(async (args: { broadcastId: string; fileName: string }) => {
    const uri = await api.reports.exportReport(args);
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export delivery report',
    });
    return uri;
  });
