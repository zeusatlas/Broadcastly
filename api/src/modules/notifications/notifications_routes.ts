import { Router } from 'express';

import {
  errorResponses,
  jsonResponse,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { notificationsController as c } from './notifications_controller';
import {
  listNotificationsSchema,
  notificationParamsSchema,
  notificationResponseSchema,
  unreadCountResponseSchema,
} from './notifications_schemas';

export const notificationsRouter = Router();

// Every executive has a feed; platform admins have none.
notificationsRouter.use(authenticate, authorize({ roles: ['head', 'executive'] }));
notificationsRouter.get('/', validate({ query: listNotificationsSchema }), c.list);
notificationsRouter.get('/unread-count', c.unreadCount);
notificationsRouter.post('/read-all', c.markAllRead);
notificationsRouter.post(
  '/:notificationId/read',
  validate({ params: notificationParamsSchema }),
  c.markRead,
);

const NOT_EXECUTIVE: [number, string] = [403, 'Platform admins have no notification feed.'];
const register = (
  route: Omit<Parameters<typeof openApiRegistry.registerPath>[0], 'tags' | 'security'>,
) =>
  openApiRegistry.registerPath({
    ...route,
    tags: ['Notifications'],
    security: [{ [bearerAuth.name]: [] }],
  });

register({
  method: 'get',
  path: '/notifications',
  operationId: 'listNotifications',
  summary: 'List notifications',
  description:
    'Your notifications, newest first (FR-NOT-01). Filter by `status` (unread or read) and `search` the text.',
  request: { query: listNotificationsSchema },
  responses: {
    200: jsonResponse(
      'A page of notifications.',
      successEnvelope(paginatedSchema(notificationResponseSchema), 'Notifications retrieved.'),
    ),
    ...errorResponses(401, NOT_EXECUTIVE, 422),
  },
});
register({
  method: 'get',
  path: '/notifications/unread-count',
  operationId: 'getUnreadNotificationCount',
  summary: 'Count unread notifications',
  description: 'The number for the bell on the home screen.',
  responses: {
    200: jsonResponse(
      'The count.',
      successEnvelope(unreadCountResponseSchema, 'Unread count retrieved.'),
    ),
    ...errorResponses(401, NOT_EXECUTIVE),
  },
});
register({
  method: 'post',
  path: '/notifications/read-all',
  operationId: 'markAllNotificationsRead',
  summary: 'Mark all as read',
  description: 'Marks every unread notification as read.',
  responses: {
    200: jsonResponse(
      'The new count (0).',
      successEnvelope(unreadCountResponseSchema, 'All notifications marked as read.'),
    ),
    ...errorResponses(401, NOT_EXECUTIVE),
  },
});
register({
  method: 'post',
  path: '/notifications/{notificationId}/read',
  operationId: 'markNotificationRead',
  summary: 'Mark one as read',
  description: 'Marks one of your notifications as read. Repeating it changes nothing.',
  request: { params: notificationParamsSchema },
  responses: {
    200: jsonResponse(
      'The notification.',
      successEnvelope(notificationResponseSchema, 'Notification marked as read.'),
    ),
    ...errorResponses(401, NOT_EXECUTIVE, [
      404,
      'Not one of your notifications.',
      'Notification not found.',
    ]),
  },
});
