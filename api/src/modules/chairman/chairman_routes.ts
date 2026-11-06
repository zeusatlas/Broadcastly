import { Router } from 'express';
import { z } from 'zod';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  messageEnvelope,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { imageUpload } from '../../common/uploads/image_upload';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { chairmanController as c } from './chairman_controller';
import {
  appointmentParamsSchema,
  appointmentSchema,
  createOrganisationExecutiveSchema,
  createPositionSchema,
  createUnitSchema,
  endAppointmentSchema,
  executiveParamsSchema,
  executiveResponseSchema,
  listExecutivesSchema,
  listUnitsSchema,
  organisationOverviewResponseSchema,
  positionParamsSchema,
  positionResponseSchema,
  unitResponseSchema,
  updatePositionSchema,
  notificationPreferencesResponseSchema,
  updateNotificationPreferencesSchema,
} from './chairman_schemas';

export const chairmanRouter = Router();

// Structure (positions, units) is the head's; managing people needs appointment.manage,
// limited to the units the caller reaches (checked in the service).
const chairman = authorize({ roles: ['head'] });
const manager = authorize({ permission: 'appointment.manage' });
const unitReader = authorize({
  anyOf: ['appointment.manage', 'broadcast.select_recipients', 'member.manage', 'member.import'],
});
const executiveParams = validate({ params: executiveParamsSchema });
const executiveAccess = authorize({ roles: ['head', 'executive'] });

chairmanRouter.use(authenticate);

chairmanRouter.get('/notification-preferences', executiveAccess, c.getNotificationPreferences);
chairmanRouter.patch(
  '/notification-preferences',
  chairman,
  validate({ body: updateNotificationPreferencesSchema }),
  c.updateNotificationPreferences,
);

chairmanRouter.get('/overview', executiveAccess, c.getOverview);
chairmanRouter.post('/logo', chairman, imageUpload('organisation-logos', 'logo'), c.uploadLogo);
chairmanRouter.delete('/logo', chairman, c.removeLogo);
chairmanRouter.get('/positions', manager, c.listPositions);
chairmanRouter.post(
  '/positions',
  chairman,
  validate({ body: createPositionSchema }),
  c.createPosition,
);
chairmanRouter.patch(
  '/positions/:positionId',
  chairman,
  validate({ params: positionParamsSchema, body: updatePositionSchema }),
  c.updatePosition,
);
chairmanRouter.get('/units', unitReader, validate({ query: listUnitsSchema }), c.listUnits);
chairmanRouter.post('/units', chairman, validate({ body: createUnitSchema }), c.createUnit);
chairmanRouter.get(
  '/executives',
  manager,
  validate({ query: listExecutivesSchema }),
  c.listExecutives,
);
chairmanRouter.post(
  '/executives',
  manager,
  validate({ body: createOrganisationExecutiveSchema }),
  c.createExecutive,
);
chairmanRouter.get('/executives/:executiveId', manager, executiveParams, c.getExecutive);
chairmanRouter.post(
  '/executives/:executiveId/appointments',
  manager,
  validate({ params: executiveParamsSchema, body: appointmentSchema }),
  c.addAppointment,
);
chairmanRouter.post(
  '/executives/:executiveId/suspend',
  manager,
  executiveParams,
  c.suspendExecutive,
);
chairmanRouter.post(
  '/executives/:executiveId/reactivate',
  manager,
  executiveParams,
  c.reactivateExecutive,
);
chairmanRouter.post(
  '/appointments/:appointmentId/end',
  manager,
  validate({ params: appointmentParamsSchema, body: endAppointmentSchema }),
  c.endAppointment,
);

const tags = ['Organisation'];
const security = [{ [bearerAuth.name]: [] }];
const NOT_CHAIRMAN: [number, string] = [403, 'Not the chairman of this organisation.'];
const NOT_MANAGER: [number, string] = [
  403,
  'No appointment.manage permission, outside the units you manage, or a chairman/self target.',
];
const NOT_EXECUTIVE: [number, string] = [403, 'Not an executive of an organisation.'];
const NO_EXECUTIVE: [number, string, string] = [
  404,
  'No such executive you can see.',
  'Executive not found.',
];

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
    path: `/organisation${doc.path}`,
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

const APPOINTMENT_EXAMPLE = {
  positionId: '3f2c1a9e-6b7d-4e8f-9a0b-1c2d3e4f5a6b',
  unitId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  permissions: ['member.manage', 'broadcast.draft'],
};

document({
  method: 'get',
  path: '/notification-preferences',
  operationId: 'getOrganisationNotificationPreferences',
  summary: 'Get organisation notification preferences',
  description:
    'The organisation’s notification preferences. Any executive can read them; only the chairman changes them.',
  response: successEnvelope(
    notificationPreferencesResponseSchema,
    'Notification preferences retrieved.',
  ),
  message: 'The organisation notification preferences.',
  errors: [NOT_EXECUTIVE],
});
document({
  method: 'patch',
  path: '/notification-preferences',
  operationId: 'updateOrganisationNotificationPreferences',
  summary: 'Update organisation notification preferences',
  description:
    'Update notification preferences for approvals, broadcasts, imports, security and digest delivery.',
  request: {
    body: jsonBody(updateNotificationPreferencesSchema, {
      approvals: true,
      broadcasts: true,
      digest: false,
    }),
  },
  response: successEnvelope(
    notificationPreferencesResponseSchema,
    'Notification preferences updated.',
  ),
  message: 'Updated organisation notification preferences.',
  errors: [NOT_CHAIRMAN, 422],
});

document({
  method: 'get',
  path: '/overview',
  operationId: 'getOrganisationOverview',
  summary: 'Organisation overview',
  description: `
Counts for the home screen, limited to the units you reach.

- \`members\` is null unless you are organisation-wide (members are not placed in units yet).
- \`positions\` counts this organisation's active positions, not the built-in Chairman.
`,
  response: successEnvelope(organisationOverviewResponseSchema, 'Overview retrieved.'),
  message: 'The overview.',
  errors: [NOT_EXECUTIVE],
});
document({
  method: 'get',
  path: '/positions',
  operationId: 'listPositions',
  summary: 'List positions',
  description:
    'The built-in Chairman and every position this organisation created, with how many hold each.',
  response: successEnvelope(positionResponseSchema.array(), 'Positions retrieved.'),
  message: 'All positions.',
  errors: [NOT_MANAGER],
});
document({
  method: 'post',
  path: '/positions',
  operationId: 'createPosition',
  summary: 'Create a position',
  description: `
Chairman only. An office executives can be appointed to, e.g. Constituency Organiser.

- \`unitType\` is \`organisation\` for an organisation-wide office, or the unit type it sits in (e.g. \`branch\`).
- Titles are unique within the organisation, ignoring case.
`,
  request: {
    body: jsonBody(createPositionSchema, {
      title: 'Constituency Organiser',
      unitType: 'organisation',
    }),
  },
  status: 201,
  response: successEnvelope(positionResponseSchema, 'Position created.', 201),
  message: 'The new position.',
  errors: [NOT_CHAIRMAN, [409, 'The title is already used.'], 422],
});
document({
  method: 'patch',
  path: '/positions/{positionId}',
  operationId: 'updatePosition',
  summary: 'Rename or retire a position',
  description:
    'Chairman only. Built-in positions cannot be changed. A retired position cannot be given to anyone new.',
  request: {
    params: positionParamsSchema,
    body: jsonBody(updatePositionSchema, { title: 'Constituency Youth Organiser', isActive: true }),
  },
  response: successEnvelope(positionResponseSchema, 'Position updated.'),
  message: 'The position.',
  errors: [
    [403, 'Not the chairman, or a built-in position.'],
    [404, 'No such position.'],
    [409, 'The title is already used.'],
    422,
  ],
});
document({
  method: 'get',
  path: '/units',
  operationId: 'listUnits',
  summary: 'List units',
  description: `
Browse the organisation's units one level at a time.

- No \`parentId\`: the top level you reach. With \`parentId\`: its children. \`search\` matches names at any level.
`,
  request: { query: listUnitsSchema },
  response: successEnvelope(paginatedSchema(unitResponseSchema), 'Units retrieved.'),
  message: 'A page of units.',
  errors: [NOT_MANAGER, 422],
});
document({
  method: 'post',
  path: '/units',
  operationId: 'createUnit',
  summary: 'Create a unit',
  description:
    'Chairman only. Add an electoral area, branch, polling station, … under an optional parent. Names are unique among siblings.',
  request: {
    body: jsonBody(createUnitSchema, {
      name: 'Asafo Branch',
      type: 'branch',
      parentId: APPOINTMENT_EXAMPLE.unitId,
    }),
  },
  status: 201,
  response: successEnvelope(unitResponseSchema, 'Unit created.', 201),
  message: 'The new unit.',
  errors: [
    NOT_CHAIRMAN,
    [404, 'The parent unit is not in this organisation.'],
    [409, 'A sibling has this name.'],
    422,
  ],
});
document({
  method: 'get',
  path: '/executives',
  operationId: 'listMyExecutives',
  summary: 'List executives',
  description:
    'Executives of your organisation you can manage, with their positions and permissions.',
  request: { query: listExecutivesSchema },
  response: successEnvelope(paginatedSchema(executiveResponseSchema), 'Executives retrieved.'),
  message: 'A page of executives.',
  errors: [NOT_MANAGER, 422],
});
document({
  method: 'post',
  path: '/executives',
  operationId: 'appointExecutive',
  summary: 'Appoint an executive',
  description: `
Promote a member of your organisation to executive and appoint them to a position, in one step.

- If \`memberNumber\` matches a member of this organisation, that member is promoted; otherwise one is created.
- The position decides the place: organisation-wide (no \`unitId\`) or a unit of its type.
- You can only grant permissions you hold. They sign in on the mobile app.
`,
  request: {
    body: jsonBody(createOrganisationExecutiveSchema, {
      firstName: 'Ama',
      lastName: 'Boateng',
      memberNumber: 'M-004513',
      email: 'ama.boateng@example.com',
      phone: '0241234568',
      dateOfBirth: '1990-04-12',
      ...APPOINTMENT_EXAMPLE,
    }),
  },
  status: 201,
  response: successEnvelope(executiveResponseSchema, 'Executive appointed.', 201),
  message: 'The new executive.',
  errors: [
    NOT_MANAGER,
    [404, 'No such position or unit.'],
    [409, 'The email or member already has an account.'],
    422,
  ],
});
document({
  method: 'get',
  path: '/executives/{executiveId}',
  operationId: 'getMyExecutive',
  summary: 'Get an executive',
  description: 'One executive with their positions, units and permissions.',
  request: { params: executiveParamsSchema },
  response: successEnvelope(executiveResponseSchema, 'Executive retrieved.'),
  message: 'The executive.',
  errors: [NOT_MANAGER, NO_EXECUTIVE, 422],
});
document({
  method: 'post',
  path: '/executives/{executiveId}/appointments',
  operationId: 'addAppointment',
  summary: 'Give an executive another position',
  description:
    'Same rules as appointing. Holding the same position in the same place twice is refused.',
  request: {
    params: executiveParamsSchema,
    body: jsonBody(appointmentSchema, APPOINTMENT_EXAMPLE),
  },
  status: 201,
  response: successEnvelope(executiveResponseSchema, 'Appointment added.', 201),
  message: 'The executive.',
  errors: [NOT_MANAGER, NO_EXECUTIVE, [409, 'They already hold this position here.'], 422],
});
document({
  method: 'post',
  path: '/appointments/{appointmentId}/end',
  operationId: 'endAppointment',
  summary: 'End an appointment',
  description:
    'Ends the appointment and revokes its permissions at once. History is kept. The chairman appointment cannot be ended here.',
  request: {
    params: appointmentParamsSchema,
    body: { ...jsonBody(endAppointmentSchema, { reason: 'Term ended' }), required: false },
  },
  response: messageEnvelope('Appointment ended.'),
  message: 'Ended.',
  errors: [
    NOT_MANAGER,
    [404, 'No such appointment in your organisation.'],
    [409, 'Already ended.'],
    422,
  ],
});
for (const [action, verb] of [
  ['suspend', 'Suspend'],
  ['reactivate', 'Reactivate'],
] as const) {
  document({
    method: 'post',
    path: `/executives/{executiveId}/${action}`,
    operationId: `${action}MyExecutive`,
    summary: `${verb} an executive`,
    description:
      action === 'suspend'
        ? 'Stop one of your executives from signing in; their sessions end at once.'
        : 'Let a suspended executive sign in again.',
    request: { params: executiveParamsSchema },
    response: successEnvelope(
      executiveResponseSchema,
      action === 'suspend' ? 'Account suspended.' : 'Account reactivated.',
    ),
    message: 'The executive.',
    errors: [NOT_MANAGER, NO_EXECUTIVE, [409, 'The account is deactivated.'], 422],
  });
}

const logoResponseSchema = z
  .object({ logoUrl: z.url().nullable() })
  .openapi('OrganisationLogoResponse');

document({
  method: 'post',
  path: '/logo',
  operationId: 'uploadOwnOrganisationLogo',
  summary: "Upload your organisation's logo",
  description:
    'Chairman only. `multipart/form-data` with one image in the field `logo`: PNG, JPEG or WebP, 2 MB at most. Replaces any previous logo; everyone sees it as `organisation.logoUrl` on `/auth/me`.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({ logo: z.string().openapi({ type: 'string', format: 'binary' }) }),
        },
      },
    },
  },
  response: successEnvelope(logoResponseSchema, 'Logo updated.'),
  message: 'The new logo URL.',
  errors: [NOT_CHAIRMAN, 422],
});
document({
  method: 'delete',
  path: '/logo',
  operationId: 'removeOwnOrganisationLogo',
  summary: "Remove your organisation's logo",
  description: 'Chairman only. `logoUrl` becomes `null`.',
  response: successEnvelope(logoResponseSchema, 'Logo removed.'),
  message: 'No logo.',
  errors: [NOT_CHAIRMAN],
});
