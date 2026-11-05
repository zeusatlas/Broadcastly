import type { BroadcastApiResponse, BroadcastDetail, BroadcastSummary } from '../types';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const displayDate = (broadcast: BroadcastApiResponse) =>
  formatDate(
    broadcast.completedAt ?? broadcast.submittedAt ?? broadcast.scheduledAt ?? broadcast.createdAt,
  );

export function toBroadcastSummary(broadcast: BroadcastApiResponse): BroadcastSummary {
  return {
    id: broadcast.id,
    title: broadcast.title ?? 'Untitled broadcast',
    audience: broadcast.audienceSummary ?? 'Selected recipients',
    sentAt: displayDate(broadcast),
    status: broadcast.status,
    delivered: broadcast.deliveredCount,
    recipients: broadcast.recipientCount,
  };
}

export function toBroadcastDetail(broadcast: BroadcastApiResponse): BroadcastDetail {
  return {
    ...toBroadcastSummary(broadcast),
    message: broadcast.message,
    estimatedSegments: broadcast.segmentCount,
    estimatedCost: broadcast.estimatedCredits,
    failed: broadcast.failedCount,
  };
}
