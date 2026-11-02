import { Badge, type BadgeTone } from '@/components/ui';

import type { BroadcastStatus } from '../types';

export const BROADCAST_STATUS_LABEL: Record<BroadcastStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  processing: 'Sending',
  submitted: 'Submitted',
  completed: 'Completed',
  partially_failed: 'Partly failed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<BroadcastStatus, BadgeTone> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  scheduled: 'primary',
  processing: 'primary',
  submitted: 'primary',
  completed: 'success',
  partially_failed: 'warning',
  failed: 'destructive',
  cancelled: 'neutral',
};

// Colour always comes with the text label, never on its own.
export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  return (
    <Badge label={BROADCAST_STATUS_LABEL[status]} tone={STATUS_TONE[status]} variant="subtle" />
  );
}
