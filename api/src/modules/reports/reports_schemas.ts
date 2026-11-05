import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import { DELIVERY_STATES, type ListDeliveriesRequest, type ReportParams } from './reports_types';

export const reportParamsSchema = z.object({
  broadcastId: z.uuid(),
}) satisfies z.ZodType<ReportParams>;

export const listDeliveriesSchema = pageQuerySchema.extend({
  status: z.enum(DELIVERY_STATES).optional(),
}) satisfies z.ZodType<ListDeliveriesRequest>;

export const deliveryResponseSchema = z
  .object({
    id: z.uuid(),
    memberName: z.string().nullable().openapi({ example: 'Akosua Boateng' }),
    phone: z.string().openapi({ example: '+233 •• ••• 4567' }),
    status: z.enum(DELIVERY_STATES),
    error: z.string().nullable().openapi({ example: 'Absent subscriber' }),
    submittedAt: z.iso.datetime().nullable(),
    statusAt: z.iso.datetime().nullable(),
  })
  .openapi('DeliveryResponse');
