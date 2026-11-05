import type { PageParams } from '../../common/http/pagination';

// The events FR-NOT-01 names; the app picks an icon per type.
export const NOTIFICATION_TYPES = [
  'approval_request',
  'approval_decision',
  'import_completed',
  'broadcast_delivered',
  'broadcast_partially_failed',
  'broadcast_failed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NewNotification {
  organisationId: string;
  executiveIds: readonly string[];
  type: NotificationType;
  title: string;
  body: string;
  broadcastId?: string | null;
}

export const NOTIFICATION_FILTERS = ['unread', 'read'] as const;

export interface ListNotificationsRequest extends PageParams {
  status?: (typeof NOTIFICATION_FILTERS)[number];
  search?: string;
}

export interface NotificationParams {
  notificationId: string;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  broadcastId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface UnreadCountResponse {
  unread: number;
}
