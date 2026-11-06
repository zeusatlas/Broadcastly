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
  updatePlatformAdminPermissionsSchema,
  userResponseSchema,
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
  replaceHeadSchema,
  updateOrganisationSchema,
  purchaseSummaryResponseSchema,
  listOrganisationsSchema,
  listPlatformAdminsSchema,
  listAuditLogSchema,
  auditEventResponseSchema,
  listPlatformCreditTransactionsSchema,
  platformCreditTransactionResponseSchema,
  platformSettingsResponseSchema,
  updatePlatformSettingsSchema,
  createCreditAdjustmentSchema,
  organisationExecutiveParamsSchema,
  organisationExecutiveResponseSchema,
  organisationParamsSchema,
  organisationResponseSchema,
  platformAdminParamsSchema,
  platformOverviewResponseSchema,
  listPlatformNotificationsSchema,
  platformNotificationParamsSchema,
  platformNotificationResponseSchema,
  platformUnreadCountResponseSchema,
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
const canManageOrganisations = authorize({ permission: 'platform.organisation.manage' });
const canManageExecutives = authorize({ permission: 'platform.executive.manage' });
const canManageCredits = authorize({ permission: 'platform.credit.manage' });
const canViewFinance = authorize({ permission: 'platform.finance.view' });
const canViewBroadcasts = authorize({ permission: 'platform.broadcast.view' });
const canViewAudit = authorize({ permission: 'platform.audit.view' });
const canManageSettings = authorize({ permission: 'platform.settings.manage' });
const canManageAdmins = authorize({ permission: 'platform.admin.manage' });
const canOperate = authorize({ permission: 'platform.organisation.operate' });

platformRouter.get('/overview', c.getOverview);
platformRouter.get(
  '/notifications',
  validate({ query: listPlatformNotificationsSchema }),
  c.listNotifications,
);
platformRouter.get('/notifications/unread-count', c.getUnreadNotificationCount);
platformRouter.post('/notifications/read-all', c.markAllNotificationsRead);
platformRouter.post(
  '/notifications/:notificationId/read',
  validate({ params: platformNotificationParamsSchema }),
  c.markNotificationRead,
);
platformRouter.get('/settings', c.getSettings);
platformRouter.patch(
  '/settings',
  canManageSettings,
  validate({ body: updatePlatformSettingsSchema }),
  c.updateSettings,
);
platformRouter.get(
  '/audit-log',
  canViewAudit,
  validate({ query: listAuditLogSchema }),
  c.listAuditLog,
);
platformRouter.get(
  '/organisations',
  validate({ query: listOrganisationsSchema }),
  c.listOrganisations,
);
platformRouter.post(
  '/organisations',
  canManageOrganisations,
  validate({ body: createOrganisationSchema }),
  c.createOrganisation,
);
platformRouter.get('/organisations/:organisationId', organisation, c.getOrganisation);
platformRouter.post(`${ORGANISATION}/workspace`, canOperate, organisation, c.openWorkspace);
const appointHead = [
  canManageOrganisations,
  validate({ params: organisationParamsSchema, body: appointChairmanSchema }),
  c.appointChairman,
];
platformRouter.post(`${ORGANISATION}/head`, ...appointHead);
// Older path, kept for the web app.
platformRouter.post(`${ORGANISATION}/chairman`, ...appointHead);
platformRouter.patch(
  '/organisations/:organisationId',
  canManageOrganisations,
  validate({ params: organisationParamsSchema, body: updateOrganisationSchema }),
  c.updateOrganisation,
);
platformRouter.post(
  '/organisations/:organisationId/head/replace',
  canManageOrganisations,
  validate({ params: organisationParamsSchema, body: replaceHeadSchema }),
  c.replaceHead,
);
platformRouter.get(
  EXECUTIVES,
  validate({ params: organisationParamsSchema, query: listOrganisationExecutivesSchema }),
  c.listOrganisationExecutives,
);
platformRouter.get(`${EXECUTIVES}/:executiveId`, executive, c.getOrganisationExecutive);
platformRouter.post(
  `${EXECUTIVES}/:executiveId/suspend`,
  canManageExecutives,
  executive,
  c.suspendExecutive,
);
platformRouter.post(
  `${EXECUTIVES}/:executiveId/reactivate`,
  canManageExecutives,
  executive,
  c.reactivateExecutive,
);
platformRouter.post(
  `${ORGANISATION}/suspend`,
  canManageOrganisations,
  organisation,
  c.suspendOrganisation,
);
platformRouter.post(
  `${ORGANISATION}/reactivate`,
  canManageOrganisations,
  organisation,
  c.reactivateOrganisation,
);
platformRouter.post(
  `${ORGANISATION}/logo`,
  canManageOrganisations,
  organisation,
  logoUpload,
  c.uploadOrganisationLogo,
);
platformRouter.delete(
  `${ORGANISATION}/logo`,
  canManageOrganisations,
  organisation,
  c.removeOrganisationLogo,
);
platformRouter.get(
  `${ORGANISATION}/broadcasts`,
  canViewBroadcasts,
  validate({ params: organisationParamsSchema, query: listOrganisationBroadcastsSchema }),
  c.listOrganisationBroadcasts,
);
platformRouter.get(
  `${ORGANISATION}/purchases`,
  canViewFinance,
  validate({ params: organisationParamsSchema, query: listPurchasesSchema }),
  c.listOrganisationPurchases,
);
platformRouter.get(
  `${ORGANISATION}/credit-transactions`,
  canViewFinance,
  validate({ params: organisationParamsSchema, query: listOrganisationCreditTransactionsSchema }),
  c.listOrganisationCreditTransactions,
);
platformRouter.get(
  '/credit-transactions',
  canViewFinance,
  validate({ query: listPlatformCreditTransactionsSchema }),
  c.listPlatformCreditTransactions,
);
platformRouter.post(
  '/credit-adjustments',
  canManageCredits,
  validate({ body: createCreditAdjustmentSchema }),
  c.createCreditAdjustment,
);
platformRouter.get(
  '/broadcasts',
  canViewBroadcasts,
  validate({ query: listBroadcastsSchema }),
  c.listBroadcasts,
);
platformRouter.get(
  '/purchases',
  canViewFinance,
  validate({ query: listPlatformPurchasesSchema }),
  c.listPurchases,
);
platformRouter.get(
  '/purchases/summary',
  canViewFinance,
  validate({ query: periodQuerySchema }),
  c.getPurchaseSummary,
);
platformRouter.get('/admins', validate({ query: listPlatformAdminsSchema }), c.listPlatformAdmins);
platformRouter.post(
  '/admins',
  canManageAdmins,
  validate({ body: createPlatformAdminSchema }),
  c.createPlatformAdmin,
);
platformRouter.get('/admins/:platformAdminId', admin, c.getPlatformAdmin);
platformRouter.post(
  '/admins/:platformAdminId/suspend',
  canManageAdmins,
  admin,
  c.suspendPlatformAdmin,
);
platformRouter.post(
  '/admins/:platformAdminId/reactivate',
  canManageAdmins,
  admin,
  c.reactivatePlatformAdmin,
);
platformRouter.patch(
  '/admins/:platformAdminId/permissions',
  canManageAdmins,
  validate({ params: platformAdminParamsSchema, body: updatePlatformAdminPermissionsSchema }),
  c.updatePlatformAdminPermissions,
);

const tags = ['Platform'];
const security = [{ [bearerAuth.name]: [] }];
const NOT_ADMIN: [number, string] = [
  403,
  'Not a platform admin, or missing the platform permission this route needs.',
];
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
  method: 'get' | 'post' | 'patch' | 'delete';
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
  path: '/audit-log',
  operationId: 'listPlatformAuditLog',
  summary: 'List audit events',
  description:
    'Review immutable administrative activity with actor, action, organisation and period filters.',
  request: { query: listAuditLogSchema },
  response: successEnvelope(paginatedSchema(auditEventResponseSchema), 'Audit log retrieved.'),
  message: 'A page of audit events.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'get',
  path: '/settings',
  operationId: 'getPlatformSettings',
  summary: 'Get platform settings',
  description: 'Read persistent import limits and platform administrator notification preferences.',
  response: successEnvelope(platformSettingsResponseSchema, 'Platform settings retrieved.'),
  message: 'Platform settings.',
  errors: [NOT_ADMIN],
});
document({
  method: 'patch',
  path: '/settings',
  operationId: 'updatePlatformSettings',
  summary: 'Update platform settings',
  description:
    'Update import limits or notification preferences and record the change in the audit log.',
  request: {
    body: jsonBody(updatePlatformSettingsSchema, {
      importLimits: {
        maxFileSizeMb: 25,
        maxRowsPerFile: 10000,
        allowedFileTypes: { csv: true, xlsx: true },
      },
      notificationPreferences: { security: true, payments: true, service: true, digest: false },
    }),
  },
  response: successEnvelope(platformSettingsResponseSchema, 'Platform settings updated.'),
  message: 'Updated platform settings.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'get',
  path: '/organisations',
  operationId: 'listOrganisations',
  summary: 'List organisations',
  description:
    'Organisations by name, each with its head (or `null`) and counts. Filter by `status` and `hasHead`.',
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
    'Create a constituency or other organisation. The organisation starts without a head.',
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
  description: 'One organisation with its head and counts.',
  request: { params: organisationParamsSchema },
  response: successEnvelope(organisationResponseSchema, 'Organisation retrieved.'),
  message: 'The organisation.',
  errors: [NOT_ADMIN, NO_ORGANISATION, 422],
});
document({
  method: 'post',
  path: '/organisations/{organisationId}/head',
  operationId: 'appointHead',
  summary: 'Appoint the organisation head',
  description: `
  Promote a member of this organisation to executive and appoint them as its head, in one step.

- If \`memberNumber\` matches a member of this organisation, that member is promoted; otherwise one is created.
  - One head per organisation. They sign in on the mobile app, create positions and appoint executives.
`,
  request: {
    params: organisationParamsSchema,
    body: jsonBody(appointChairmanSchema, {
      firstName: 'Kofi',
      lastName: 'Asante',
      memberNumber: 'M-004512',
      email: 'kofi.asante@example.com',
      phone: '0241234567',
      dateOfBirth: '1978-05-20',
    }),
  },
  status: 201,
  response: successEnvelope(organisationResponseSchema, 'Organisation head appointed.', 201),
  message: 'The organisation with its head.',
  errors: [
    NOT_ADMIN,
    NO_ORGANISATION,
    [
      409,
      'Already has a head, is inactive, or the email or member has an account.',
      'This organisation already has a head.',
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
    'Executives of this organisation with the positions they hold. `search` matches name, email or member ID.',
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
    'Create another platform admin with the ticked `permissions` (none if omitted). You can only grant permissions you hold. Needs `platform.admin.manage`.',
  request: {
    body: jsonBody(createPlatformAdminSchema, {
      firstName: 'Yaw',
      lastName: 'Darko',
      email: 'yaw.darko@example.com',
      phone: '0271234567',
      permissions: ['platform.organisation.manage', 'platform.executive.manage'],
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
document({
  method: 'get',
  path: '/admins/{platformAdminId}',
  operationId: 'getPlatformAdmin',
  summary: 'Get a platform admin',
  description: 'One platform admin with their status and permissions.',
  request: { params: platformAdminParamsSchema },
  response: successEnvelope(platformAdminResponseSchema, 'Platform admin retrieved.'),
  message: 'The platform admin.',
  errors: [NOT_ADMIN, NO_ACCOUNT, 422],
});
document({
  method: 'patch',
  path: '/admins/{platformAdminId}/permissions',
  operationId: 'updatePlatformAdminPermissions',
  summary: "Change an admin's permissions",
  description:
    "Replace another admin's permissions. Applies on their next request. You can only add or remove permissions you hold; the main admin's permissions and your own cannot be changed.",
  request: {
    params: platformAdminParamsSchema,
    body: jsonBody(updatePlatformAdminPermissionsSchema, {
      permissions: ['platform.organisation.manage', 'platform.finance.view'],
    }),
  },
  response: successEnvelope(platformAdminResponseSchema, 'Permissions updated.'),
  message: 'The admin with their new permissions.',
  errors: [
    [
      403,
      'Missing `platform.admin.manage`, your own account, the main admin, or a permission you do not hold.',
      'You can only give or remove permissions you hold yourself.',
    ],
    NO_ACCOUNT,
    422,
  ],
});
document({
  method: 'patch',
  path: '/organisations/{organisationId}',
  operationId: 'updateOrganisation',
  summary: 'Rename an organisation',
  description:
    'Change its name and/or what it calls its head (`headTitle`, e.g. Head, Director) and its `description` (20 words at most; `null` clears it). Names stay unique, ignoring case. Needs `platform.organisation.manage`.',
  request: {
    params: organisationParamsSchema,
    body: jsonBody(updateOrganisationSchema, { name: 'Central North', headTitle: 'Director' }),
  },
  response: successEnvelope(organisationResponseSchema, 'Organisation updated.'),
  message: 'The organisation after the change.',
  errors: [
    NOT_ADMIN,
    NO_ORGANISATION,
    [409, 'Another organisation has this name.', 'An organisation with this name already exists.'],
    422,
  ],
});
document({
  method: 'post',
  path: '/organisations/{organisationId}/head/replace',
  operationId: 'replaceHead',
  summary: 'Replace the organisation head',
  description: `
Ends the current head's appointment and appoints the new head in one step.

- Body: \`{ executiveId }\` for an executive already in this organisation, or the same fields as appointing a head.
- The old head keeps their account, other positions and own credits; head access stops on their next request.`,
  request: {
    params: organisationParamsSchema,
    body: jsonBody(replaceHeadSchema, { executiveId: '3f2c1a9e-6b7d-4e8f-9a0b-1c2d3e4f5a6b' }),
  },
  response: successEnvelope(organisationResponseSchema, 'Head replaced.'),
  message: 'The organisation with its new head.',
  errors: [
    NOT_ADMIN,
    NO_ORGANISATION,
    [
      409,
      'No head yet, inactive organisation, the same person, or an inactive executive.',
      'This executive is already the head.',
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
document({
  method: 'get',
  path: '/credit-transactions',
  operationId: 'listPlatformCreditTransactions',
  summary: 'List the platform credit ledger',
  description: 'Review organisation wallet movements with organisation, type and period filters.',
  request: { query: listPlatformCreditTransactionsSchema },
  response: successEnvelope(
    paginatedSchema(platformCreditTransactionResponseSchema),
    'Credit ledger retrieved.',
  ),
  message: 'A page of credit transactions.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'post',
  path: '/credit-adjustments',
  operationId: 'createPlatformCreditAdjustment',
  summary: 'Record a credit adjustment',
  description:
    'Post a signed, reasoned adjustment to an organisation wallet. Requires an Idempotency-Key header.',
  request: {
    body: jsonBody(createCreditAdjustmentSchema, {
      organisationId: '11111111-1111-4111-8111-111111111111',
      amount: 300,
      reason: 'Corrected a confirmed delivery discrepancy.',
    }),
  },
  status: 201,
  response: successEnvelope(creditTransactionResponseSchema, 'Credit adjustment recorded.', 201),
  message: 'The adjustment ledger entry.',
  errors: [NOT_ADMIN, 409, 422],
});
document({
  method: 'get',
  path: '/notifications',
  operationId: 'listPlatformNotifications',
  summary: 'List my notifications',
  description: `
What other people did that you may see: purchases and failed payments (\`platform.finance.view\`),
credit adjustments (\`platform.credit.manage\`), admin changes (\`platform.admin.manage\`), locked
accounts and reused sign-ins (\`platform.audit.view\`), and new organisations, heads and suspensions
(everyone). Built from the audit log; never your own actions. Filter by \`status\` and \`search\`.`,
  request: { query: listPlatformNotificationsSchema },
  response: successEnvelope(
    paginatedSchema(platformNotificationResponseSchema),
    'Notifications retrieved.',
  ),
  message: 'A page of notifications, newest first.',
  errors: [NOT_ADMIN, 422],
});
document({
  method: 'get',
  path: '/notifications/unread-count',
  operationId: 'getPlatformUnreadCount',
  summary: 'Count unread notifications',
  description: 'For the badge on the home bell.',
  response: successEnvelope(platformUnreadCountResponseSchema, 'Unread count retrieved.'),
  message: 'How many are unread.',
  errors: [NOT_ADMIN],
});
document({
  method: 'post',
  path: '/notifications/{notificationId}/read',
  operationId: 'markPlatformNotificationRead',
  summary: 'Mark one notification as read',
  description: 'Safe to repeat. Returns the new unread count.',
  request: { params: platformNotificationParamsSchema },
  response: successEnvelope(platformUnreadCountResponseSchema, 'Notification marked as read.'),
  message: 'The new unread count.',
  errors: [NOT_ADMIN, [404, 'No notification has this id.', 'Notification not found.'], 422],
});
document({
  method: 'post',
  path: '/notifications/read-all',
  operationId: 'markAllPlatformNotificationsRead',
  summary: 'Mark every notification as read',
  description: 'Everything up to now counts as read.',
  response: successEnvelope(platformUnreadCountResponseSchema, 'All notifications marked as read.'),
  message: 'Unread is now 0.',
  errors: [NOT_ADMIN],
});
document({
  method: 'post',
  path: '/organisations/{organisationId}/workspace',
  operationId: 'openOrganisationWorkspace',
  summary: 'Work inside an organisation',
  description: `
Needs \`platform.organisation.operate\`. Returns the profile the app uses while you work inside this
organisation: role \`head\`, every head permission, the organisation. Then send
\`X-Organisation-Id: <id>\` on member, broadcast, template, approval, credit, report, notification
and organisation requests; they run as the head, and the audit log names you.
\`/auth\` and \`/platform\` requests ignore the header. Opening is recorded in the audit log.`,
  request: { params: organisationParamsSchema },
  response: successEnvelope(userResponseSchema, 'Organisation opened.'),
  message: 'The working profile.',
  errors: [
    NOT_ADMIN,
    NO_ORGANISATION,
    [
      409,
      'Suspended, or no head yet.',
      'Appoint a head first: the organisation works through its head.',
    ],
    422,
  ],
});
