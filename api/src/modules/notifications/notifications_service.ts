import type { EntityManager } from 'typeorm';

import { ForbiddenError, NotFoundError } from '../../common/errors/app_error';
import type { Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';
import type { AccessContext } from '../auth';

import { notificationsRepository } from './notifications_repository';
import type {
  ListNotificationsRequest,
  NewNotification,
  NotificationResponse,
  UnreadCountResponse,
} from './notifications_types';

const executiveOf = (auth: AccessContext) => {
  if (auth.kind !== 'executive')
    throw new ForbiddenError('Notifications are for executives of an organisation.');
  return auth.accountId;
};

export const notificationsService = {
  // Other modules call this inside their own transaction, so the notice exists only if the event does.
  notify(
    notification: NewNotification,
    manager: EntityManager = dataSource.manager,
  ): Promise<void> {
    return notificationsRepository.insert(notification, manager);
  },

  list(
    auth: AccessContext,
    request: ListNotificationsRequest,
  ): Promise<Paginated<NotificationResponse>> {
    return notificationsRepository.list(executiveOf(auth), request);
  },

  async unreadCount(auth: AccessContext): Promise<UnreadCountResponse> {
    return { unread: await notificationsRepository.unreadCount(executiveOf(auth)) };
  },

  async markRead(auth: AccessContext, notificationId: string): Promise<NotificationResponse> {
    const notification = await notificationsRepository.markRead(executiveOf(auth), notificationId);
    if (!notification) throw new NotFoundError('Notification not found.');
    return notification;
  },

  async markAllRead(auth: AccessContext): Promise<UnreadCountResponse> {
    await notificationsRepository.markAllRead(executiveOf(auth));
    return { unread: 0 };
  },
};
