import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
  type ListNotificationsRequest,
  type NotificationParams,
} from './notifications_types';

export const listNotificationsSchema = pageQuerySchema.extend({
  status: z.enum(NOTIFICATION_FILTERS).optional(),
  search: z.string().trim().max(100).optional(),
}) satisfies z.ZodType<ListNotificationsRequest>;

export const notificationParamsSchema = z.object({
  notificationId: z.uuid(),
}) satisfies z.ZodType<NotificationParams>;

export const notificationResponseSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(NOTIFICATION_TYPES),
    title: z.string().openapi({ example: 'Approval requested' }),
    body: z.string().openapi({ example: 'Kofi Asante sent “Saturday meeting” for approval.' }),
    broadcastId: z.uuid().nullable(),
    isRead: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi('NotificationResponse');

export const unreadCountResponseSchema = z
  .object({ unread: z.number().int().openapi({ example: 3 }) })
  .openapi('UnreadCountResponse');
