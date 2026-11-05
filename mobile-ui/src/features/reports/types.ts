import type { BroadcastApiResponse, BroadcastStatus } from '@/features/broadcasts';
import type { PageParams } from '@/types/api';

// Server statuses behind each Reports chip; only broadcasts that reached the network have a report.
export type ReportFilter = 'all' | 'sending' | 'completed' | 'partially_failed' | 'failed';

export type DeliveryStatus = 'pending' | 'submitted' | 'delivered' | 'failed' | 'unknown';

export interface ReportBroadcastResponse extends BroadcastApiResponse {
  submittedCount: number;
  sentBy: string | null;
}

export interface ListReportsParams extends PageParams {
  statuses: BroadcastStatus[];
  search?: string;
}

export interface ListDeliveriesParams extends PageParams {
  status?: DeliveryStatus;
}

export interface DeliveryResponse {
  id: string;
  memberName: string | null;
  // Masked by the server; the full number never reaches the device.
  phone: string;
  status: DeliveryStatus;
  error: string | null;
  submittedAt: string | null;
  statusAt: string | null;
}
