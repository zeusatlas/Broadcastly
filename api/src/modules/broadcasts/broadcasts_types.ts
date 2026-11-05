import type { PageParams } from '../../common/http/pagination';

// Every state FR-SMS-12 names, in lifecycle order.
export const BROADCAST_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'processing',
  'submitted',
  'completed',
  'partially_failed',
  'failed',
  'cancelled',
] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

// A recipient row's life: queued, being handed over, accepted by the provider, then its report (FR-REP-02).
export const RECIPIENT_STATUSES = [
  'pending',
  'sending',
  'submitted',
  'delivered',
  'failed',
  'unknown',
] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const AUDIENCE_LEVELS = [
  'constituency',
  'electoral_area',
  'branch',
  'polling_station',
  'executive_group',
] as const;
export type AudienceLevel = (typeof AUDIENCE_LEVELS)[number];

// The one per-recipient field (FR-SMS-05); {meeting_date} and {meeting_location} are filled by the sender.
export const RECIPIENT_FIELD = '{first_name}';

export interface BroadcastAudienceRequest {
  level: AudienceLevel;
  unitIds?: string[];
}

export interface ListBroadcastsRequest extends PageParams {
  statuses?: BroadcastStatus[];
  search?: string;
  mine?: boolean;
}

export interface CreateBroadcastRequest {
  title?: string;
  message: string;
  audience: BroadcastAudienceRequest;
  scheduledAt?: string | null;
}

export interface UpdateBroadcastRequest {
  title?: string | null;
  message?: string;
  audience?: BroadcastAudienceRequest;
  scheduledAt?: string | null;
}

export interface EstimateBroadcastRequest {
  message: string;
  audience: BroadcastAudienceRequest;
}

// Optional on submit and send; omitted keeps the draft's own schedule.
export interface DispatchBroadcastRequest {
  scheduledAt?: string | null;
}

export interface BroadcastParams {
  broadcastId: string;
}

export interface RecipientCounts {
  matched: number;
  recipientCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface BroadcastEstimateResponse extends RecipientCounts {
  encoding: 'GSM-7' | 'Unicode';
  characters: number;
  segments: number;
  estimatedCredits: number;
  wallet: { owner: 'organisation' | 'executive'; available: number };
}

// The read shape shared with the platform admin's lists.
export interface BroadcastResponse {
  id: string;
  organisationId: string;
  organisationName: string;
  title: string | null;
  message: string;
  status: BroadcastStatus;
  audienceSummary: string | null;
  recipientCount: number;
  segmentCount: number;
  estimatedCredits: number;
  deliveredCount: number;
  failedCount: number;
  createdBy: string | null;
  scheduledAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ApprovalDecisionResponse {
  decision: 'approved' | 'rejected';
  reason: string | null;
  decidedBy: string;
  decidedAt: Date;
}

export interface BroadcastDetailResponse extends BroadcastResponse {
  createdById: string;
  audience: BroadcastAudienceRequest;
  submittedCount: number;
  sentBy: string | null;
  cancelledAt: Date | null;
  latestDecision: ApprovalDecisionResponse | null;
}

export interface DeliveryReportResponse {
  updated: number;
}
