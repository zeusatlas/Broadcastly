import type { PageParams } from '@/types/api';

// The kinds of in-app notification the SRS names (FR-NOT-01).
export type NotificationType =
  | 'approval_request'
  | 'approval_decision'
  | 'import_completed'
  | 'broadcast_delivered'
  | 'broadcast_partially_failed'
  | 'broadcast_failed';

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  broadcastId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ListNotificationsParams extends PageParams {
  status?: 'unread' | 'read';
  search?: string;
}

export interface UnreadCountResponse {
  unread: number;
}

export interface OrganisationNotificationPreferences {
  security: boolean;
  approvals: boolean;
  broadcasts: boolean;
  imports: boolean;
  digest: boolean;
}

export type UpdateOrganisationNotificationPreferencesRequest =
  Partial<OrganisationNotificationPreferences>;
