// The kinds of in-app notification the SRS names (FR-NOT-01).
export type NotificationType =
  | 'approval_request'
  | 'approval_decision'
  | 'import_completed'
  | 'broadcast_delivered'
  | 'broadcast_partially_failed';

export interface NotificationItemData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  isUnread: boolean;
}
