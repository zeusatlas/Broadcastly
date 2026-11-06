import type { Href } from 'expo-router';

import { NotificationFeed } from '../components/NotificationFeed';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationPages,
} from '../hooks/use_notifications';
import type { NotificationResponse } from '../types';

// Where a notification leads: the approval queue, the import history, or the broadcast itself.
function destinationOf(notification: NotificationResponse): Href | null {
  if (notification.type === 'approval_request') return '/approvals';
  if (notification.type === 'import_completed') return '/members/imports';
  if (notification.broadcastId) {
    return { pathname: '/broadcasts/[id]', params: { id: notification.broadcastId } };
  }
  return null;
}

// Opens from the home bell, sliding in from the right.
export function NotificationsScreen() {
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  return (
    <NotificationFeed
      usePagesFor={useNotificationPages}
      markRead={async (item) => Boolean(await markRead.mutate({ notificationId: item.id }))}
      markAllRead={async () => Boolean(await markAll.mutate(undefined))}
      destinationOf={destinationOf}
      emptyDescription="Approvals, imports and delivery updates will appear here."
    />
  );
}
