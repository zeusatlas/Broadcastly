import type { PageParams } from '../../common/http/pagination';

export const DELIVERY_STATES = ['pending', 'submitted', 'delivered', 'failed', 'unknown'] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

export interface ReportParams {
  broadcastId: string;
}

export interface ListDeliveriesRequest extends PageParams {
  status?: DeliveryState;
}

// Phones are masked: enough to recognise a number, not to harvest a list (NFR-PRIV-01).
export interface DeliveryResponse {
  id: string;
  memberName: string | null;
  phone: string;
  status: DeliveryState;
  error: string | null;
  submittedAt: Date | null;
  statusAt: Date | null;
}

export interface DeliveryRow extends Omit<DeliveryResponse, 'status'> {
  status: DeliveryState | 'sending';
}
