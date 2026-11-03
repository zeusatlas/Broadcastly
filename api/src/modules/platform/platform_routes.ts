import { Router } from 'express';
import { z } from 'zod';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { imageUpload } from '../../common/uploads/image_upload';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import {
  authenticate,
  authorize,
  createPlatformAdminSchema,
  platformAdminResponseSchema,
} from '../auth';
import { broadcastResponseSchema } from '../broadcasts';
import {
  creditTransactionResponseSchema,
  listPurchasesSchema,
  purchaseResponseSchema,
} from '../credits';

import { platformController as c } from './platform_controller';
import {
  appointChairmanSchema,
  createOrganisationSchema,
  listBroadcastsSchema,
  listOrganisationBroadcastsSchema,
  listOrganisationCreditTransactionsSchema,
  listOrganisationExecutivesSchema,
  listPlatformPurchasesSchema,
  periodQuerySchema,
  purchaseSummaryResponseSchema,
  listOrganisationsSchema,
  listPlatformAdminsSchema,
  organisationExecutiveParamsSchema,
  organisationExecutiveResponseSchema,
  organisationParamsSchema,
  organisationResponseSchema,
  platformAdminParamsSchema,
  platformOverviewResponseSchema,
} from './platform_schemas';

export const platformRouter = Router();

// Applied once for the whole router, so no platform route can be added unprotected.
platformRouter.use(authenticate, authorize({ roles: ['platform_admin'] }));

const organisation = validate({ params: organisationParamsSchema });
const executive = validate({ params: organisationExecutiveParamsSchema });
const admin = validate({ params: platformAdminParamsSchema });
const EXECUTIVES = '/organisations/:organisationId/executives';
const ORGANISATION = '/organisations/:organisationId';
const logoUpload = imageUpload('organisation-logos', 'logo');

platformRouter.get('/overview', c.getOverview);
platformRouter.get(
  '/organisations',
  validate({ query: listOrganisationsSchema }),
  c.listOrganisations,
);
platformRouter.post(
  '/organisations',
  validate({ body: createOrganisationSchema }),
  c.createOrganisation,
);
platformRouter.get('/organisations/:organisationId', organisation, c.getOrganisation);
platformRouter.post(
  '/organisations/:organisationId/chairman',
  validate({ params: organisationParamsSchema, body: appointChairmanSchema }),
  c.appointChairman,
);
platformRouter.get(
  EXECUTIVES,
  validate({ params: organisationParamsSchema, query: listOrganisationExecutivesSchema }),
  c.listOrganisationExecutives,
);
platformRouter.get(`${EXECUTIVES}/:executiveId`, executive, c.getOrganisationExecutive);
platformRouter.post(`${EXECUTIVES}/:executiveId/suspend`, executive, c.suspendExecutive);
platformRouter.post(`${EXECUTIVES}/:executiveId/reactivate`, executive, c.reactivateExecutive);
platformRouter.post(`${ORGANISATION}/suspend`, organisation, c.suspendOrganisation);
platformRouter.post(`${ORGANISATION}/reactivate`, organisation, c.reactivateOrganisation);
platformRouter.post(`${ORGANISATION}/logo`, organisation, logoUpload, c.uploadOrganisationLogo);
platformRouter.delete(`${ORGANISATION}/logo`, organisation, c.removeOrganisationLogo);
platformRouter.get(
  `${ORGANISATION}/broadcasts`,
  validate({ params: organisationParamsSchema, query: listOrganisationBroadcastsSchema }),
  c.listOrganisationBroadcasts,
);
platformRouter.get(
  `${ORGANISATION}/purchases`,
  validate({ params: organisationParamsSchema, query: listPurchasesSchema }),
  c.listOrganisationPurchases,
);
platformRouter.get(
  `${ORGANISATION}/credit-transactions`,
  validate({ params: organisationParamsSchema, query: listOrganisationCreditTransactionsSchema }),
  c.listOrganisationCreditTransactions,
);
platformRouter.get('/broadcasts', validate({ query: listBroadcastsSchema }), c.listBroadcasts);
platformRouter.get('/purchases', validate({ query: listPlatformPurchasesSchema }), c.listPurchases);
platformRouter.get(
  '/purchases/summary',
  validate({ query: periodQuerySchema }),
  c.getPurchaseSummary,
);
platformRouter.get('/admins', validate({ query: listPlatformAdminsSchema }), c.listPlatformAdmins);
platformRouter.post(
  '/admins',
  validate({ body: createPlatformAdminSchema }),
  c.createPlatformAdmin,
);
platformRouter.post('/admins/:platformAdminId/suspend', admin, c.suspendPlatformAdmin);
platformRouter.post('/admins/:platformAdminId/reactivate', admin, c.reactivatePlatformAdmin);

const tags = ['Platform'];
const security = [{ [bearerAuth.name]: [] }];
const NOT_ADMIN: [number, string] = [403, 'Signed in, but not a platform admin.'];
const SELF: [number, string, string] = [
  403,
  'Not a platform admin, or the account is your own.',
  'You cannot change the status of your own account.',
];
const NO_ORGANISATION: [number, string, string] = [
  404,
  'No organisation has this id.',
  'Organisation not found.',
];
const NO_EXECUTIVE: [number, string, string] = [
  404,
  'No executive with this id in this organisation.',
  'Executive not found in this organisation.',
];
const NO_ACCOUNT: [number, string, string] = [404, 'No account has this id.', 'Account not found.'];

interface Doc {
  method: 'get' | 'post' | 'delete';
  path: string;
  operationId: string;
  summary: string;
  description: string;
  request?: Record<string, unknown>;
  status?: 200 | 201;
  response: Parameters<typeof jsonResponse>[1];
  message: string;
  errors: Parameters<typeof errorResponses>;
}

function document(doc: Doc) {
  openApiRegistry.registerPath({
    method: doc.method,
    path: `/platform${doc.path}`,
    operationId: doc.operationId,
    tags,
    summary: doc.summary,
    description: doc.description,
    security,
    request: doc.request,
    responses: {
      [doc.status ?? 200]: jsonResponse(doc.message, doc.response),
      ...errorResponses(401, ...doc.errors),
    },
  });
}

document({
  method: 'get',
  path: '/overview',
  operationId: 'getPlatformOverview',
  summary: 'Get dashboard totals',
  description: 'Counts across the whole platform for the admin dashboard.',
  response: successEnvelope(platformOverviewResponseSchema, 'Overview retrieved.'),
  message: 'Totals.',
  errors: [NOT_ADMIN],
});
document({
  method: 'get',
  path: '/organisations',
  operationId: 'listOrganisations',
  summary: 'List organisations',
  description:
    'Organisations by name, each with its chairman (or `null`) and counts. Filter by `status` and `hasChairman`.',
  request: { query: listOrganisationsSchema },
  response: successEnvelope(
    paginatedSchema(organisationResponseSchema),
    'Organisations retrieved.',
  ),
  message: 'A page of organisations.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'post',
  path: '/organisations',
  operationId: 'createOrganisation',
  summary: 'Create an organisation',
  description:
    'Create a constituency or other organisation, then appoint its chairman. Names are unique, ignoring case.',
  request: {
    body: jsonBody(createOrganisationSchema, {
      name: 'Central Constituency',
      type: 'constituency',
    }),
  },
  status: 201,
  response: successEnvelope(organisationResponseSchema, 'Organisation created.', 201),
  message: 'The new organisation.',
  errors: [
    NOT_ADMIN,
    [409, 'The name is already used.', 'An organisation with this name already exists.'],
    422,
  ],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}',
  operationId: 'getOrganisation',
  summary: 'Get an organisation',
  description: 'One organisation with its chairman and counts.',
  request: { params: organisationParamsSchema },
  response: successEnvelope(organisationResponseSchema, 'Organisation retrieved.'),
  message: 'The organisation.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'post',
  path: '/organisations/{organisationId}/chairman',
  operationId: 'appointChairman',
  summary: 'Appoint the chairman',
  description: `
Promote a member of this organisation to executive and appoint them chairman, in one step.

- If \`partyId\` matches a member of this organisation, that member is promoted; otherwise one is created.
- One chairman per organisation. They sign in on the mobile app, create positions and appoint executives.
`,
  request: {
    params: organisationParamsSchema,
    body: jsonBody(appointChairmanSchema, {
      firstName: 'Kofi',
      lastName: 'Asante',
      partyId: 'M-004512',
      email: 'kofi.asante@example.com',
      phone: '0241234567',
      dateOfBirth: '1978-05-20',
    }),
  },
  status: 201,
  response: successEnvelope(organisationResponseSchema, 'Chairman appointed.', 201),
  message: 'The organisation with its chairman.',
  errors: [
    NOT_ADMIN,
    NO_ORGANISATION,
    [
      409,
      'Already has a chairman, is inactive, or the email or member has an account.',
      'This organisation already has a chairman.',
    ],
    422,
  ],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}/executives',
  operationId: 'listOrganisationExecutives',
  summary: "List an organisation's executives",
  description:
    'Executives of this organisation with the positions they hold. `search` matches name, email or party ID.',
  request: { params: organisationParamsSchema, query: listOrganisationExecutivesSchema },
  response: successEnvelope(
    paginatedSchema(organisationExecutiveResponseSchema),
    'Executives retrieved.',
  ),
  message: 'A page of executives.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}/executives/{executiveId}',
  operationId: 'getOrganisationExecutive',
  summary: 'Get an executive',
  description: 'One executive of this organisation and the positions they hold.',
  request: { params: organisationExecutiveParamsSchema },
  response: successEnvelope(organisationExecutiveResponseSchema, 'Executive retrieved.'),
  message: 'The executive.',
  errors: [NOT_ADMIN, NO_EXECUTIVE, 422],
});
for (const [action, verb] of [
  ['suspend', 'Suspend'],
  ['reactivate', 'Reactivate'],
] as const) {
  const suspending = action === 'suspend';
  const message = suspending ? 'Account suspended.' : 'Account reactivated.';
  document({
    method: 'post',
    path: `/organisations/{organisationId}/executives/{executiveId}/${action}`,
    operationId: `${action}Executive`,
    summary: `${verb} an executive`,
    description: suspending
      ? 'Stop this executive from signing in; their sessions end at once. Repeating it changes nothing.'
      : 'Let a suspended executive sign in again.',
    request: { params: organisationExecutiveParamsSchema },
    response: successEnvelope(organisationExecutiveResponseSchema, message),
    message: 'The executive.',
    errors: [NOT_ADMIN, NO_EXECUTIVE, [409, 'The account is deactivated.'], 422],
  });
  document({
    method: 'post',
    path: `/admins/{platformAdminId}/${action}`,
    operationId: `${action}PlatformAdmin`,
    summary: `${verb} a platform admin`,
    description: suspending
      ? 'Stop another platform admin from signing in; their sessions end at once.'
      : 'Let a suspended platform admin sign in again.',
    request: { params: platformAdminParamsSchema },
    response: successEnvelope(platformAdminResponseSchema, message),
    message: 'The platform admin.',
    errors: [SELF, NO_ACCOUNT, 422],
  });
}
document({
  method: 'get',
  path: '/admins',
  operationId: 'listPlatformAdmins',
  summary: 'List platform admins',
  description: 'Every platform admin, including suspended ones. `search` matches name or email.',
  request: { query: listPlatformAdminsSchema },
  response: successEnvelope(
    paginatedSchema(platformAdminResponseSchema),
    'Platform admins retrieved.',
  ),
  message: 'A page of platform admins.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'post',
  path: '/admins',
  operationId: 'createPlatformAdmin',
  summary: 'Add a platform admin',
  description:
    'Create another platform admin. They are not party members; they sign in through `/auth` like everyone.',
  request: {
    body: jsonBody(createPlatformAdminSchema, {
      firstName: 'Yaw',
      lastName: 'Darko',
      email: 'yaw.darko@example.com',
      phone: '0271234567',
    }),
  },
  status: 201,
  response: successEnvelope(platformAdminResponseSchema, 'Platform admin created.', 201),
  message: 'The new platform admin.',
  errors: [
    NOT_ADMIN,
    [
      409,
      'The email is already used by any account.',
      'An account with this email already exists.',
    ],
    422,
  ],
});

const PERIOD_HELP =
  '`period`: `today`, `yesterday`, `last_3_days`, `last_7_days`, `last_30_days`, `last_365_days`, `all_time` (default), or `custom` with `from` and/or `to` (YYYY-MM-DD, both inclusive). Rolling periods end now.';

for (const [action, verb] of [
  ['suspend', 'Suspend'],
  ['reactivate', 'Reactivate'],
] as const) {
  const suspending = action === 'suspend';
  document({
    method: 'post',
    path: `/organisations/{organisationId}/${action}`,
    operationId: `${action}Organisation`,
    summary: `${verb} an organisation`,
    description: suspending
      ? 'Stop the whole organisation: every executive’s sessions end at once and none can sign in until it is reactivated. Its data is kept. Repeating it changes nothing.'
      : 'Let a suspended organisation’s executives sign in again (their own account status still applies).',
    request: { params: organisationParamsSchema },
    response: successEnvelope(
      organisationResponseSchema,
      suspending ? 'Organisation suspended.' : 'Organisation reactivated.',
    ),
    message: 'The organisation.',
    errors: [NOT_ADMIN, NO_ORGANISATION, [409, 'The organisation is inactive.'], 422],
  });
}
document({
  method: 'post',
  path: '/organisations/{organisationId}/logo',
  operationId: 'uploadOrganisationLogo',
  summary: "Upload an organisation's logo",
  description:
    'Send `multipart/form-data` with one image in the field `logo`: PNG, JPEG or WebP, 2 MB at most. It replaces any previous logo; `logoUrl` in the response points to it.',
  request: {
    params: organisationParamsSchema,
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({ logo: z.string().openapi({ type: 'string', format: 'binary' }) }),
        },
      },
    },
  },
  response: successEnvelope(organisationResponseSchema, 'Logo updated.'),
  message: 'The organisation with its new logoUrl.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'delete',
  path: '/organisations/{organisationId}/logo',
  operationId: 'removeOrganisationLogo',
  summary: "Remove an organisation's logo",
  description: 'Deletes the logo; `logoUrl` becomes `null`.',
  request: { params: organisationParamsSchema },
  response: successEnvelope(organisationResponseSchema, 'Logo removed.'),
  message: 'The organisation.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/broadcasts',
  operationId: 'listPlatformBroadcasts',
  summary: 'List broadcasts across organisations',
  description: `Newest first. Filter by \`organisationId\`, \`status\`, \`search\` (title or message) and ${PERIOD_HELP}`,
  request: { query: listBroadcastsSchema },
  response: successEnvelope(paginatedSchema(broadcastResponseSchema), 'Broadcasts retrieved.'),
  message: 'A page of broadcasts.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}/broadcasts',
  operationId: 'listOrganisationBroadcasts',
  summary: "List an organisation's broadcasts",
  description: `Newest first. Filter by \`status\`, \`search\` and ${PERIOD_HELP}`,
  request: { params: organisationParamsSchema, query: listOrganisationBroadcastsSchema },
  response: successEnvelope(paginatedSchema(broadcastResponseSchema), 'Broadcasts retrieved.'),
  message: 'A page of broadcasts.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/purchases',
  operationId: 'listPlatformPurchases',
  summary: 'List credit purchases across organisations',
  description: `Newest first. Filter by \`organisationId\`, \`status\` (\`pending\`, \`completed\`, \`failed\`) and ${PERIOD_HELP}`,
  request: { query: listPlatformPurchasesSchema },
  response: successEnvelope(paginatedSchema(purchaseResponseSchema), 'Purchases retrieved.'),
  message: 'A page of purchases.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/purchases/summary',
  operationId: 'getPurchaseSummary',
  summary: 'Total credits purchased',
  description: `Credits bought and amount paid (completed purchases), plus pending and failed counts, across all organisations. ${PERIOD_HELP}`,
  request: { query: periodQuerySchema },
  response: successEnvelope(purchaseSummaryResponseSchema, 'Purchase summary retrieved.'),
  message: 'Totals for the period.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}/purchases',
  operationId: 'listOrganisationPurchases',
  summary: "List an organisation's credit purchases",
  description: `Newest first. Filter by \`status\` and ${PERIOD_HELP}`,
  request: { params: organisationParamsSchema, query: listPurchasesSchema },
  response: successEnvelope(paginatedSchema(purchaseResponseSchema), 'Purchases retrieved.'),
  message: 'A page of purchases.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'get',
  path: '/organisations/{organisationId}/credit-transactions',
  operationId: 'listOrganisationCreditTransactions',
  summary: "List an organisation's credit history",
  description: `The organisation wallet's ledger, newest first. ${PERIOD_HELP}`,
  request: { params: organisationParamsSchema, query: listOrganisationCreditTransactionsSchema },
  response: successEnvelope(
    paginatedSchema(creditTransactionResponseSchema),
    'Credit history retrieved.',
  ),
  message: 'A page of ledger entries.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
