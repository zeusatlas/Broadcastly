import { Router } from 'express';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';
import { broadcastDetailResponseSchema } from '../broadcasts';

import { approvalsController as c } from './approvals_controller';
import {
  approvalDetailResponseSchema,
  approvalParamsSchema,
  approveBroadcastSchema,
  listApprovalsSchema,
  rejectBroadcastSchema,
} from './approvals_schemas';

export const approvalsRouter = Router();

approvalsRouter.use(authenticate, authorize({ permission: 'broadcast.approve' }));
approvalsRouter.get('/', validate({ query: listApprovalsSchema }), c.list);
approvalsRouter.get('/:broadcastId', validate({ params: approvalParamsSchema }), c.get);
approvalsRouter.post(
  '/:broadcastId/approve',
  validate({ params: approvalParamsSchema, body: approveBroadcastSchema }),
  c.approve,
);
approvalsRouter.post(
  '/:broadcastId/reject',
  validate({ params: approvalParamsSchema, body: rejectBroadcastSchema }),
  c.reject,
);

type RouteDoc = Omit<Parameters<typeof openApiRegistry.registerPath>[0], 'tags' | 'security'>;
type ErrorSpec = Parameters<typeof errorResponses>[number];

const NO_PERMISSION: ErrorSpec = [403, 'No broadcast.approve permission.'];
const NOT_YOURS: ErrorSpec = [
  404,
  'Your own, or its audience is outside your reach.',
  'Broadcast not found.',
];
const DECIDED: ErrorSpec = [
  409,
  'Already decided, or (approve) the author is short of credits.',
  'This broadcast is no longer waiting for approval.',
];
const decided = (message: string) =>
  jsonResponse(
    'The broadcast after the decision.',
    successEnvelope(broadcastDetailResponseSchema, message),
  );

function document(route: RouteDoc) {
  openApiRegistry.registerPath({
    ...route,
    tags: ['Approvals'],
    security: [{ [bearerAuth.name]: [] }],
  });
}

document({
  method: 'get',
  path: '/approvals',
  operationId: 'listApprovals',
  summary: 'List approvals',
  description: `\`pending\` (default): broadcasts waiting for you, oldest first. \`decided\`: ones you decided.
- You see only broadcasts whose whole audience you reach, and never your own.`,
  request: { query: listApprovalsSchema },
  responses: {
    200: jsonResponse(
      'A page of broadcasts.',
      successEnvelope(paginatedSchema(broadcastDetailResponseSchema), 'Approvals retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, 422),
  },
});
document({
  method: 'get',
  path: '/approvals/{broadcastId}',
  operationId: 'getApproval',
  summary: 'Get an approval',
  description:
    'The broadcast, every decision on it, and the credits free in the wallet that would pay.',
  request: { params: approvalParamsSchema },
  responses: {
    200: jsonResponse(
      'The approval.',
      successEnvelope(approvalDetailResponseSchema, 'Approval retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, NOT_YOURS),
  },
});
document({
  method: 'post',
  path: '/approvals/{broadcastId}/approve',
  operationId: 'approveBroadcast',
  summary: 'Approve a broadcast',
  description: `Records the approval and releases the broadcast (FR-APR-02, FR-APR-05).
- Reserves the author's credits and queues it now or at its schedule; 409 if they are short.`,
  request: { params: approvalParamsSchema, body: jsonBody(approveBroadcastSchema, {}) },
  responses: {
    200: decided('Approved and sending.'),
    ...errorResponses(401, NO_PERMISSION, NOT_YOURS, DECIDED, 422),
  },
});
document({
  method: 'post',
  path: '/approvals/{broadcastId}/reject',
  operationId: 'rejectBroadcast',
  summary: 'Reject a broadcast',
  description:
    'Returns it to the author’s drafts with your reason, which they see on the broadcast (FR-APR-04).',
  request: {
    params: approvalParamsSchema,
    body: jsonBody(rejectBroadcastSchema, { reason: 'Please add the meeting venue.' }),
  },
  responses: {
    200: decided('Returned to the author.'),
    ...errorResponses(401, NO_PERMISSION, NOT_YOURS, DECIDED, 422),
  },
});
