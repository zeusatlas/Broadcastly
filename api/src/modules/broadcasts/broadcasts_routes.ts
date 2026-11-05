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

import { broadcastsController as c } from './broadcasts_controller';
import {
  broadcastDetailResponseSchema,
  broadcastEstimateResponseSchema,
  broadcastParamsSchema,
  createBroadcastSchema,
  deliveryReportRequestSchema,
  deliveryReportResponseSchema,
  dispatchBroadcastSchema,
  estimateBroadcastSchema,
  listBroadcastsSchema,
  updateBroadcastSchema,
} from './broadcasts_schemas';

export const broadcastsRouter = Router();

const params = validate({ params: broadcastParamsSchema });
const reader = authorize({
  anyOf: ['report.view', 'broadcast.draft', 'broadcast.submit', 'broadcast.send'],
});
const drafter = authorize({ permission: 'broadcast.draft' });

// Called by the SMS provider, not the app: the driver checks the callback before anything changes.
broadcastsRouter.post('/delivery-reports', c.deliveryReport);

broadcastsRouter.use(authenticate);
broadcastsRouter.post(
  '/estimate',
  drafter,
  validate({ body: estimateBroadcastSchema }),
  c.estimate,
);
broadcastsRouter.get('/', reader, validate({ query: listBroadcastsSchema }), c.list);
broadcastsRouter.post('/', drafter, validate({ body: createBroadcastSchema }), c.create);
broadcastsRouter.get('/:broadcastId', reader, params, c.get);
broadcastsRouter.patch(
  '/:broadcastId',
  drafter,
  validate({ params: broadcastParamsSchema, body: updateBroadcastSchema }),
  c.update,
);
broadcastsRouter.post(
  '/:broadcastId/submit',
  authorize({ permission: 'broadcast.submit' }),
  validate({ params: broadcastParamsSchema, body: dispatchBroadcastSchema }),
  c.submit,
);
broadcastsRouter.post(
  '/:broadcastId/send',
  authorize({ permission: 'broadcast.send' }),
  validate({ params: broadcastParamsSchema, body: dispatchBroadcastSchema }),
  c.send,
);
broadcastsRouter.post(
  '/:broadcastId/cancel',
  authorize({ anyOf: ['broadcast.draft', 'broadcast.send', 'broadcast.approve'] }),
  params,
  c.cancel,
);

type RouteDoc = Omit<Parameters<typeof openApiRegistry.registerPath>[0], 'tags' | 'security'>;
type ErrorSpec = Parameters<typeof errorResponses>[number];

const NO_BROADCAST: ErrorSpec = [
  404,
  'Not a broadcast you can see or act on.',
  'Broadcast not found.',
];
const OUT_OF_SCOPE: ErrorSpec = [403, 'Missing permission, or the audience is outside your scope.'];
const AUDIENCE = { level: 'branch', unitIds: ['7d1e9a3c-2b4f-4c6d-8e0a-1b2c3d4e5f60'] };
const detail = (message: string, status = 200) =>
  jsonResponse('The broadcast.', successEnvelope(broadcastDetailResponseSchema, message, status));

function document(route: RouteDoc, isPublic = false) {
  openApiRegistry.registerPath({
    ...route,
    tags: ['Broadcasts'],
    security: isPublic ? [] : [{ [bearerAuth.name]: [] }],
  });
}

document({
  method: 'post',
  path: '/broadcasts/estimate',
  operationId: 'estimateBroadcast',
  summary: 'Estimate a broadcast',
  description: `Recipients, segments and credits for a message and audience, before saving (FR-SMS-07).
- Counts duplicates and invalid numbers that would be left out (FR-SMS-08, FR-SMS-09).
- \`wallet\` is the one that would pay: the organisation's for the chairman, your own otherwise.`,
  request: {
    body: jsonBody(estimateBroadcastSchema, {
      message: 'Hello {first_name}, branch meeting on Saturday.',
      audience: AUDIENCE,
    }),
  },
  responses: {
    200: jsonResponse(
      'The estimate.',
      successEnvelope(broadcastEstimateResponseSchema, 'Estimate ready.'),
    ),
    ...errorResponses(401, OUT_OF_SCOPE, 422),
  },
});
document({
  method: 'get',
  path: '/broadcasts',
  operationId: 'listBroadcasts',
  summary: 'List broadcasts',
  description: `Broadcasts you can see, newest first.
- Without \`report.view\` you see only your own; \`mine=true\` narrows anyone's list to their own.
- \`statuses\` takes a comma-separated list.`,
  request: { query: listBroadcastsSchema },
  responses: {
    200: jsonResponse(
      'A page of broadcasts.',
      successEnvelope(paginatedSchema(broadcastDetailResponseSchema), 'Broadcasts retrieved.'),
    ),
    ...errorResponses(401, OUT_OF_SCOPE, 422),
  },
});
document({
  method: 'post',
  path: '/broadcasts',
  operationId: 'createBroadcastDraft',
  summary: 'Save a draft',
  description: `Saves a message and audience as a draft (FR-SMS-01).
- \`{first_name}\` is filled per recipient; other fields must be filled in before sending.`,
  request: {
    body: jsonBody(createBroadcastSchema, {
      title: 'Saturday meeting',
      message: 'Hello {first_name}, branch meeting on Saturday at 9am.',
      audience: AUDIENCE,
    }),
  },
  responses: { 201: detail('Draft saved.', 201), ...errorResponses(401, OUT_OF_SCOPE, 422) },
});
document({
  method: 'get',
  path: '/broadcasts/{broadcastId}',
  operationId: 'getBroadcast',
  summary: 'Get a broadcast',
  description:
    'One broadcast with its status, delivery counts and latest approval decision (FR-APR-04).',
  request: { params: broadcastParamsSchema },
  responses: {
    200: detail('Broadcast retrieved.'),
    ...errorResponses(401, OUT_OF_SCOPE, NO_BROADCAST),
  },
});
document({
  method: 'patch',
  path: '/broadcasts/{broadcastId}',
  operationId: 'updateBroadcastDraft',
  summary: 'Edit a draft',
  description:
    'Changes your own draft. A rejected broadcast returns to draft and can be edited again.',
  request: {
    params: broadcastParamsSchema,
    body: jsonBody(updateBroadcastSchema, { title: 'Saturday meeting (venue changed)' }),
  },
  responses: {
    200: detail('Draft saved.'),
    ...errorResponses(
      401,
      OUT_OF_SCOPE,
      NO_BROADCAST,
      [409, 'It is no longer a draft.', 'Only a draft can be edited.'],
      422,
    ),
  },
});
document({
  method: 'post',
  path: '/broadcasts/{broadcastId}/submit',
  operationId: 'submitBroadcast',
  summary: 'Send for approval',
  description: `Sends your draft to the approvers who reach its audience (FR-SMS-11) and notifies them.
- Optional \`scheduledAt\` is kept for when it is approved.`,
  request: { params: broadcastParamsSchema, body: jsonBody(dispatchBroadcastSchema, {}) },
  responses: {
    200: detail('Sent for approval.'),
    ...errorResponses(
      401,
      OUT_OF_SCOPE,
      NO_BROADCAST,
      [409, 'It is no longer a draft.', 'Only a draft can be submitted for approval.'],
      422,
    ),
  },
});
document({
  method: 'post',
  path: '/broadcasts/{broadcastId}/send',
  operationId: 'sendBroadcast',
  summary: 'Send or schedule',
  description: `Sends your draft without approval (FR-APR-06), now or at \`scheduledAt\` (FR-SMS-10).
- Reserves the credits first (BR-10): the chairman's come from the organisation wallet, others' from their own.
- Send an \`Idempotency-Key\` header: repeating the request returns the same broadcast (FR-SMS-14).`,
  request: {
    params: broadcastParamsSchema,
    body: jsonBody(dispatchBroadcastSchema, { scheduledAt: '2026-11-08T09:00:00Z' }),
  },
  responses: {
    200: detail('Broadcast is sending.'),
    ...errorResponses(
      401,
      OUT_OF_SCOPE,
      NO_BROADCAST,
      [
        409,
        'Already sent, or not enough credits.',
        'Not enough credits: this broadcast needs 292 and 120 are available.',
      ],
      422,
    ),
  },
});
document({
  method: 'post',
  path: '/broadcasts/{broadcastId}/cancel',
  operationId: 'cancelBroadcast',
  summary: 'Cancel a broadcast',
  description: `Cancels a draft, a broadcast awaiting approval or a scheduled one; held credits are released.
- The author can cancel; so can a sender or approver who reaches its audience.`,
  request: { params: broadcastParamsSchema },
  responses: {
    200: detail('Broadcast cancelled.'),
    ...errorResponses(401, OUT_OF_SCOPE, NO_BROADCAST, [
      409,
      'It is already sending or finished.',
      'Only a draft, a broadcast awaiting approval or a scheduled one can be cancelled.',
    ]),
  },
});
document(
  {
    method: 'post',
    path: '/broadcasts/delivery-reports',
    operationId: 'receiveDeliveryReport',
    summary: 'Receive delivery reports',
    description: `For the SMS provider: delivery states for sent messages (FR-REP-01).
- With \`SMS_DRIVER=log\` the body is \`{ reports: [{ providerReference, state: delivered|failed|unknown }] }\`.`,
    request: {
      body: jsonBody(deliveryReportRequestSchema, {
        reports: [
          { providerReference: 'log-5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21', state: 'delivered' },
        ],
      }),
    },
    responses: {
      200: jsonResponse(
        'How many rows changed.',
        successEnvelope(deliveryReportResponseSchema, 'Delivery report received.'),
      ),
      ...errorResponses([422, 'The report could not be read.', 'Some details need fixing.']),
    },
  },
  true,
);
