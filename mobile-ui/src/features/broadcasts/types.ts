/** Every status FR-SMS-12 names. */
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

export interface BroadcastSummary {
  id: string;
  title: string;
  audience: string;
  sentAt: string;
  status: BroadcastStatus;
  delivered: number;
  recipients: number;
}

/** Organisational scopes a broadcast can target (FR-SMS-02); the server limits them to the user's scope. */
export type AudienceLevel =
  'constituency' | 'electoral_area' | 'branch' | 'polling_station' | 'executive_group';

export type DeliveryMode = 'now' | 'scheduled';

export type SmsEncoding = 'GSM-7' | 'Unicode';

export interface SegmentEstimate {
  encoding: SmsEncoding;
  characters: number;
  segments: number;
  /** Characters left before the next segment starts. */
  remaining: number;
}
