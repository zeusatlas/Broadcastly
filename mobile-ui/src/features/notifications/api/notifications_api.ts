import { http, type RequestOptions } from '@/lib/api';
import type { Paginated } from '@/types/api';

import type {
  ListNotificationsParams,
  NotificationResponse,
  OrganisationNotificationPreferences,
  UnreadCountResponse,
  UpdateOrganisationNotificationPreferencesRequest,
} from '../types';

export const notificationsEndpoints = {
  readNotifications: (params: ListNotificationsParams, options?: RequestOptions) =>
    http.get<Paginated<NotificationResponse>>('/notifications', { ...options, params }),

  readUnreadCount: (options?: RequestOptions) =>
    http.get<UnreadCountResponse>('/notifications/unread-count', options),

  markNotificationRead: ({ notificationId }: { notificationId: string }) =>
    http.post<NotificationResponse>(`/notifications/${notificationId}/read`),

  markAllNotificationsRead: () => http.post<UnreadCountResponse>('/notifications/read-all'),

  readOrganisationPreferences: (options?: RequestOptions) =>
    http.get<OrganisationNotificationPreferences>(
      '/organisation/notification-preferences',
      options,
    ),

  updateOrganisationPreferences: (credentials: UpdateOrganisationNotificationPreferencesRequest) =>
    http.patch<
      OrganisationNotificationPreferences,
      UpdateOrganisationNotificationPreferencesRequest
    >('/organisation/notification-preferences', credentials),
};
