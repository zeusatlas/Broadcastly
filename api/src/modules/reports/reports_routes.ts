import { Router } from 'express';
import { z } from 'zod';

import {
  errorResponses,
  jsonResponse,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { reportsController as c } from './reports_controller';
import {
  deliveryResponseSchema,
  listDeliveriesSchema,
  reportParamsSchema,
} from './reports_schemas';

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize({ permission: 'report.view' }));
reportsRouter.get(
  '/broadcasts/:broadcastId/deliveries',
  validate({ params: reportParamsSchema, query: listDeliveriesSchema }),
  c.deliveries,
);
reportsRouter.get(
  '/broadcasts/:broadcastId/export',
  validate({ params: reportParamsSchema }),
  c.exportDeliveries,
);

const NO_PERMISSION: Parameters<typeof errorResponses>[number] = [
  403,
  'No report.view permission.',
];
const NO_BROADCAST: Parameters<typeof errorResponses>[number] = [
  404,
  'Not a broadcast in your reach.',
  'Broadcast not found.',
];
const security = [{ [bearerAuth.name]: [] }];

openApiRegistry.registerPath({
  method: 'get',
  path: '/reports/broadcasts/{broadcastId}/deliveries',
  operationId: 'listBroadcastDeliveries',
  tags: ['Reports'],
  summary: 'List deliveries',
  description: `Each recipient's delivery state for one broadcast (FR-REP-02, FR-REP-04).
- Phones are masked. Delivered means the network reached the phone, not that it was read (BR-12).`,
  security,
  request: { params: reportParamsSchema, query: listDeliveriesSchema },
  responses: {
    200: jsonResponse(
      'A page of deliveries.',
      successEnvelope(paginatedSchema(deliveryResponseSchema), 'Delivery report retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, NO_BROADCAST, 422),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/reports/broadcasts/{broadcastId}/export',
  operationId: 'exportBroadcastDeliveries',
  tags: ['Reports'],
  summary: 'Export deliveries as CSV',
  description: `Downloads every recipient's delivery state as a CSV file (FR-REP-07). Phones are masked; each export is audited.`,
  security,
  request: { params: reportParamsSchema },
  responses: {
    200: {
      description: 'The CSV file.',
      content: {
        'text/csv': { schema: z.string().openapi({ example: '"Member","Phone","Status"' }) },
      },
    },
    ...errorResponses(401, NO_PERMISSION, NO_BROADCAST),
  },
});
