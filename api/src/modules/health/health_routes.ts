import { Router } from 'express';
import { z } from 'zod';

import { errorResponses, jsonResponse, successEnvelope } from '../../common/http/openapi_schemas';
import { openApiRegistry } from '../../config/openapi';

import { healthController } from './health_controller';

export const healthRouter = Router();

healthRouter.get('/', healthController.getHealth);

const healthResponseSchema = z
  .object({
    uptimeSeconds: z.number().openapi({ example: 3600 }),
    database: z.enum(['up', 'down']).openapi({ example: 'up' }),
    redis: z.enum(['up', 'down']).openapi({ example: 'up' }),
  })
  .openapi('HealthResponse');

openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  operationId: 'getHealth',
  tags: ['Health'],
  summary: 'Check the API is healthy',
  description: `
Check that the API, database and Redis are up. Returns 503 if any of them is down.
`,
  responses: {
    200: jsonResponse(
      'Everything is reachable.',
      successEnvelope(healthResponseSchema, 'Service is healthy.'),
    ),
    ...errorResponses(503),
  },
});
