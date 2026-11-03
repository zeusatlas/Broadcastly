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
