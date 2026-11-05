import { authorizedDownload, http, type RequestOptions } from '@/lib/api';
import type { Paginated } from '@/types/api';

import type {
  DeliveryResponse,
  ListDeliveriesParams,
  ListReportsParams,
  ReportBroadcastResponse,
} from '../types';

export const reportsEndpoints = {
  readReports: (params: ListReportsParams, options?: RequestOptions) =>
    http.get<Paginated<ReportBroadcastResponse>>('/broadcasts', {
      ...options,
      params: { ...params, statuses: params.statuses.join(',') },
    }),

  readDeliveries: (
    { broadcastId, params }: { broadcastId: string; params: ListDeliveriesParams },
    options?: RequestOptions,
  ) =>
    http.get<Paginated<DeliveryResponse>>(`/reports/broadcasts/${broadcastId}/deliveries`, {
      ...options,
      params,
    }),

  // Resolves to the local file URI of the CSV, saved in the cache directory.
  exportReport: ({ broadcastId, fileName }: { broadcastId: string; fileName: string }) =>
    authorizedDownload(`/reports/broadcasts/${broadcastId}/export`, fileName),
};
