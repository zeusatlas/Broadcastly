import type { Request, Response } from 'express';

import { sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { notificationsService } from './notifications_service';
import type { ListNotificationsRequest, NotificationParams } from './notifications_types';

export const notificationsController = {
  async list(req: Request, res: Response) {
    const query = validated<ListNotificationsRequest>(res, 'query');
    const data = await notificationsService.list(requireAuth(req), query);
    return sendSuccess(res, { data, message: 'Notifications retrieved.' });
  },

  async unreadCount(req: Request, res: Response) {
    const data = await notificationsService.unreadCount(requireAuth(req));
    return sendSuccess(res, { data, message: 'Unread count retrieved.' });
  },

  async markRead(req: Request, res: Response) {
    const { notificationId } = validated<NotificationParams>(res, 'params');
    const data = await notificationsService.markRead(requireAuth(req), notificationId);
    return sendSuccess(res, { data, message: 'Notification marked as read.' });
  },

  async markAllRead(req: Request, res: Response) {
    const data = await notificationsService.markAllRead(requireAuth(req));
    return sendSuccess(res, { data, message: 'All notifications marked as read.' });
  },
};
