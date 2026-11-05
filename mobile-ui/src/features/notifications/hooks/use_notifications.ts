import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type { NotificationFilter, NotificationResponse } from '../types';

// Every page loaded so far for one filter and search.
export const useNotificationPages = (filter: NotificationFilter, search: string) =>
  usePages<NotificationResponse>(`notifications:${filter}:${search}`, (page, options) =>
    api.notifications.readNotifications(
      {
        page,
        pageSize: PAGE_SIZE,
        status: filter === 'all' ? undefined : filter,
        search: search || undefined,
      },
      options,
    ),
  );

export const useReadUnreadCountQuery = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery(
    ['notifications', 'unread-count'],
    (options) => api.notifications.readUnreadCount(options),
    {
      enabled,
    },
  );

export const useMarkNotificationReadMutation = () =>
  useMutation(api.notifications.markNotificationRead);

export const useMarkAllNotificationsReadMutation = () =>
  useMutation(api.notifications.markAllNotificationsRead);
