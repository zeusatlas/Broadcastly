import { Router } from 'express';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { pageQuerySchema } from '../../common/http/pagination';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { platformController } from './platform_controller';
import {
  constituencyParamsSchema,
  constituencyResponseSchema,
  createConstituencySchema,
  executiveParamsSchema,
  executiveSummaryResponseSchema,
  listConstituenciesSchema,
  newExecutiveSchema,
  platformOverviewResponseSchema,
} from './platform_schemas';

export const platformRouter = Router();

// Applied once for the whole router, so no platform route can be added unprotected.
platformRouter.use(authenticate, authorize({ roles: ['platform_admin'] }));

platformRouter.get('/overview', platformController.getOverview);
platformRouter.get(
  '/constituencies',
  validate({ query: listConstituenciesSchema }),
  platformController.listConstituencies,
);
platformRouter.post(
  '/constituencies',
  validate({ body: createConstituencySchema }),
  platformController.createConstituency,
);
platformRouter.get(
  '/constituencies/:constituencyId',
  validate({ params: constituencyParamsSchema }),
  platformController.getConstituency,
);
platformRouter.post(
  '/constituencies/:constituencyId/chairman',
  validate({ params: constituencyParamsSchema, body: newExecutiveSchema }),
  platformController.appointChairman,
);
platformRouter.get(
  '/admins',
  validate({ query: pageQuerySchema }),
  platformController.listPlatformAdmins,
);
platformRouter.post(
  '/admins',
  validate({ body: newExecutiveSchema }),
  platformController.createPlatformAdmin,
);
platformRouter.post(
  '/executives/:executiveId/suspend',
  validate({ params: executiveParamsSchema }),
  platformController.suspendExecutive,
);
platformRouter.post(
  '/executives/:executiveId/reactivate',
  validate({ params: executiveParamsSchema }),
  platformController.reactivateExecutive,
);

const tags = ['Platform'];
const security = [{ [bearerAuth.name]: [] }];

const NOT_ADMIN: [number, string] = [403, 'Signed in, but not a platform admin.'];
const NOT_ADMIN_OR_SELF: [number, string] = [
  403,
  'Not a platform admin, or the account is your own.',
];
const CONSTITUENCY_NOT_FOUND: [number, string, string] = [
  404,
  'No constituency has this id.',
  'Constituency not found.',
];
const ACCOUNT_NOT_FOUND: [number, string, string] = [
  404,
  'No chairman or platform admin has this id.',
  'Account not found.',
];

const NEW_EXECUTIVE_EXAMPLE = {
  firstName: 'Kofi',
  lastName: 'Asante',
  partyId: 'M-004512',
  email: 'kofi.asante@example.com',
  phone: '0241234567',
  dateOfBirth: '1978-05-20',
};

openApiRegistry.registerPath({
  method: 'get',
  path: '/platform/overview',
  operationId: 'getPlatformOverview',
  tags,
  summary: 'Get dashboard totals',
  description: 'Counts for the admin dashboard: constituencies, chairmen, executives and admins.',
  security,
  responses: {
    200: jsonResponse(
      'Totals.',
      successEnvelope(platformOverviewResponseSchema, 'Overview retrieved.'),
    ),
    ...errorResponses(401, NOT_ADMIN),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/platform/constituencies',
  operationId: 'listConstituencies',
  tags,
  summary: 'List constituencies',
  description: `
List constituencies by name, each with its current chairman (or \`null\`).

- \`search\` matches any part of the name, ignoring case.
`,
  security,
  request: { query: listConstituenciesSchema },
  responses: {
    200: jsonResponse(
      'A page of constituencies.',
      successEnvelope(paginatedSchema(constituencyResponseSchema), 'Constituencies retrieved.'),
    ),
    ...errorResponses(401, NOT_ADMIN, 422),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/platform/constituencies',
  operationId: 'createConstituency',
  tags,
  summary: 'Create a constituency',
  description: `
Create a constituency, then appoint its chairman with \`POST /platform/constituencies/{constituencyId}/chairman\`.

- Names are unique, ignoring case and extra spaces.
`,
  security,
  request: { body: jsonBody(createConstituencySchema, { name: 'Central Constituency' }) },
  responses: {
    201: jsonResponse(
      'The new constituency.',
      successEnvelope(constituencyResponseSchema, 'Constituency created.', 201),
    ),
    ...errorResponses(
      401,
      NOT_ADMIN,
      [409, 'The name is already used.', 'A constituency with this name already exists.'],
      422,
    ),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/platform/constituencies/{constituencyId}',
  operationId: 'getConstituency',
  tags,
  summary: 'Get a constituency',
  description: 'Get one constituency and its current chairman.',
  security,
  request: { params: constituencyParamsSchema },
  responses: {
    200: jsonResponse(
      'The constituency.',
      successEnvelope(constituencyResponseSchema, 'Constituency retrieved.'),
    ),
    ...errorResponses(401, NOT_ADMIN, CONSTITUENCY_NOT_FOUND, 422),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/platform/constituencies/{constituencyId}/chairman',
  operationId: 'appointChairman',
  tags,
  summary: 'Appoint the chairman',
  description: `
Create the chairman's account and appoint them to this constituency in one step.

- They sign in on the mobile app with this email and phone; no invitation is sent yet.
- One chairman per constituency. If \`partyId\` matches a member on file, that member is used.
`,
  security,
  request: {
    params: constituencyParamsSchema,
    body: jsonBody(newExecutiveSchema, NEW_EXECUTIVE_EXAMPLE),
  },
  responses: {
    201: jsonResponse(
      'The constituency with its new chairman.',
      successEnvelope(constituencyResponseSchema, 'Chairman appointed.', 201),
    ),
    ...errorResponses(
      401,
      NOT_ADMIN,
      CONSTITUENCY_NOT_FOUND,
      [
        409,
        'Already has a chairman, is inactive, or the email or member already has an account.',
        'This constituency already has a chairman.',
      ],
      422,
    ),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/platform/admins',
  operationId: 'listPlatformAdmins',
  tags,
  summary: 'List platform admins',
  description: 'List every platform admin, including suspended ones.',
  security,
  request: { query: pageQuerySchema },
  responses: {
    200: jsonResponse(
      'A page of platform admins.',
      successEnvelope(
        paginatedSchema(executiveSummaryResponseSchema),
        'Platform admins retrieved.',
      ),
    ),
    ...errorResponses(401, NOT_ADMIN, 422),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/platform/admins',
  operationId: 'createPlatformAdmin',
  tags,
  summary: 'Add a platform admin',
  description: `
Create another platform admin. They sign in on the web with this email and phone.

- Platform admins control the whole platform; add only people who need it.
`,
  security,
  request: { body: jsonBody(newExecutiveSchema, NEW_EXECUTIVE_EXAMPLE) },
  responses: {
    201: jsonResponse(
      'The new platform admin.',
      successEnvelope(executiveSummaryResponseSchema, 'Platform admin created.', 201),
    ),
    ...errorResponses(
      401,
      NOT_ADMIN,
      [
        409,
        'The email or member already has an account.',
        'An account with this email already exists.',
      ],
      422,
    ),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/platform/executives/{executiveId}/suspend',
  operationId: 'suspendExecutive',
  tags,
  summary: 'Suspend a chairman or admin',
  description: `
Stop a chairman or platform admin from signing in. Their sessions end immediately.

- Chairmen and platform admins only, never your own account.
- Suspending an account that is already suspended changes nothing.
`,
  security,
  request: { params: executiveParamsSchema },
  responses: {
    200: jsonResponse(
      'The account, now suspended.',
      successEnvelope(executiveSummaryResponseSchema, 'Account suspended.'),
    ),
    ...errorResponses(
      401,
      NOT_ADMIN_OR_SELF,
      ACCOUNT_NOT_FOUND,
      [409, 'The account is deactivated.'],
      422,
    ),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/platform/executives/{executiveId}/reactivate',
  operationId: 'reactivateExecutive',
  tags,
  summary: 'Reactivate a chairman or admin',
  description: 'Let a suspended chairman or platform admin sign in again.',
  security,
  request: { params: executiveParamsSchema },
  responses: {
    200: jsonResponse(
      'The account, now active.',
      successEnvelope(executiveSummaryResponseSchema, 'Account reactivated.'),
    ),
    ...errorResponses(
      401,
      NOT_ADMIN_OR_SELF,
      ACCOUNT_NOT_FOUND,
      [409, 'The account is deactivated.'],
      422,
    ),
  },
});
