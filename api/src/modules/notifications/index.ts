// Public API of the notifications module — in-app notifications for approvals, decisions, imports and
// outcomes (FR-NOT-01). Email (FR-NOT-02) waits for an email provider. Other modules import from here only.
export { notificationsRouter } from './notifications_routes';
export { notificationsService } from './notifications_service';
export {
  NOTIFICATION_TYPES,
  type NewNotification,
  type NotificationType,
} from './notifications_types';
