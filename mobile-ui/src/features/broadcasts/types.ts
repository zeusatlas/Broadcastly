import type { PageParams, Paginated } from '@/types/api';

// Every status FR-SMS-12 names.
export type BroadcastStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'processing'
  | 'submitted'
  | 'completed'
  | 'partially_failed'
  | 'failed'
  | 'cancelled';

export interface BroadcastApiResponse {
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
  scheduledAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdById: string;
  audience: BroadcastAudienceRequest;
  submittedCount: number;
  sentBy: string | null;
  cancelledAt: string | null;
  latestDecision: BroadcastDecision | null;
}

export interface BroadcastDecision {
  decision: 'approved' | 'rejected';
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

// null clears the title; omitted fields stay as they are.
export interface UpdateBroadcastRequest {
  title?: string | null;
  message?: string;
  audience?: BroadcastAudienceRequest;
}

export interface ListBroadcastsParams extends PageParams {
  statuses?: BroadcastStatus[];
  search?: string;
}

export interface BroadcastAudienceRequest {
  level: AudienceLevel;
  unitIds?: string[];
}

export interface CreateBroadcastRequest {
  title?: string;
  message: string;
  audience: BroadcastAudienceRequest;
}

export type BroadcastsResponse = Paginated<BroadcastApiResponse>;

export interface EstimateBroadcastRequest {
  message: string;
  audience: BroadcastAudienceRequest;
}

export interface BroadcastEstimateResponse {
  encoding: SmsEncoding;
  characters: number;
  segments: number;
  matched: number;
  recipientCount: number;
  duplicateCount: number;
  invalidCount: number;
  estimatedCredits: number;
  wallet: { owner: 'organisation' | 'executive'; available: number };
}

// Omit scheduledAt to send at once.
export interface DispatchBroadcastRequest {
  scheduledAt?: string | null;
}

export interface BroadcastSummary {
  id: string;
  title: string;
  audience: string;
  sentAt: string;
  status: BroadcastStatus;
  delivered: number;
  recipients: number;
}

export interface BroadcastDetail extends BroadcastSummary {
  message: string;
  estimatedSegments: number;
  estimatedCost: number;
  failed: number;
}

// Organisational scopes a broadcast can target (FR-SMS-02); the server limits them to the user's scope.
export type AudienceLevel =
  'constituency' | 'electoral_area' | 'branch' | 'polling_station' | 'executive_group';

export type DeliveryMode = 'now' | 'scheduled';

export type SmsEncoding = 'GSM-7' | 'Unicode';

export interface SegmentEstimate {
  encoding: SmsEncoding;
  characters: number;
  segments: number;
  // Characters left before the next segment starts.
  remaining: number;
}

// Message templates (FR-SMS-04, FR-SMS-05): /templates.
export type TemplateCategory = 'official_notice' | 'meeting_announcement' | 'reminder';

export type TemplateField = 'first_name' | 'meeting_date' | 'meeting_location';

export interface TemplateResponse {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

export type TemplatesResponse = Paginated<TemplateResponse>;

export interface ListTemplatesParams extends PageParams {
  search?: string;
  category?: TemplateCategory;
}

export interface CreateTemplateRequest {
  name: string;
  category: TemplateCategory;
  body: string;
}

export type UpdateTemplateRequest = Partial<CreateTemplateRequest>;
