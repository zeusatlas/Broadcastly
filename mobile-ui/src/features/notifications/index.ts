// Public API of the notifications feature. Code outside this folder imports from here only.
export { NotificationsScreen } from './screens/NotificationsScreen';
export { useReadUnreadCountQuery } from './hooks/use_notifications';
export {
  useReadNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from './hooks/use_notification_preferences';
export type { NotificationResponse, NotificationType } from './types';
