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

import { createMemberImportsRouter } from './member_import_routes';
import { membersController as c } from './members_controller';
import {
  createMemberSchema,
  listMembersSchema,
  memberParamsSchema,
  memberResponseSchema,
  updateMemberSchema,
} from './members_schemas';

// A factory, not a module-level router: auth imports this module (Member, phoneSchema), so auth's
// middleware is only complete once every module has loaded and routes.ts mounts this.
export function createMembersRouter() {
  const router = Router();
  const member = validate({ params: memberParamsSchema });
  // Mounted first: imports need member.import, not the member.manage every route below requires.
  router.use('/imports', createMemberImportsRouter());
  router.use(authenticate, authorize({ permission: 'member.manage' }));

  router.get('/', validate({ query: listMembersSchema }), c.list);
  router.post('/', validate({ body: createMemberSchema }), c.create);
  router.get('/:memberId', member, c.get);
  router.patch(
    '/:memberId',
    validate({ params: memberParamsSchema, body: updateMemberSchema }),
    c.update,
  );
  router.post('/:memberId/deactivate', member, c.deactivate);
  router.post('/:memberId/reactivate', member, c.reactivate);
  return router;
}

type RouteDoc = Omit<Parameters<typeof openApiRegistry.registerPath>[0], 'tags' | 'security'>;
type ErrorSpec = Parameters<typeof errorResponses>[number];

const NO_PERMISSION: ErrorSpec = [
  403,
  'No member.manage permission, or the unit is outside your scope.',
];
const NO_MEMBER: ErrorSpec = [404, 'No such member within your scope.', 'Member not found.'];
const PARTY_ID_TAKEN: ErrorSpec = [
  409,
  'The party ID is already used.',
  'A member with this party ID already exists.',
];
const MEMBER_EXAMPLE = {
  firstName: 'Akosua',
  lastName: 'Boateng',
  partyId: 'MBR-0042',
  phone: '024 123 4567',
};

function document(route: RouteDoc) {
  openApiRegistry.registerPath({
    ...route,
    tags: ['Members'],
    security: [{ [bearerAuth.name]: [] }],
  });
}

document({
  method: 'get',
  path: '/members',
  operationId: 'listMembers',
  summary: 'List members',
  description: `Members within your scope, sorted by surname.
- Unit-scoped executives see only members of their units and the units below.
- \`unitId\` includes the units below it; \`search\` matches name, party ID or phone.`,
  request: { query: listMembersSchema },
  responses: {
    200: jsonResponse(
      'A page of members.',
      successEnvelope(paginatedSchema(memberResponseSchema), 'Members retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, 422),
  },
});
document({
  method: 'post',
  path: '/members',
  operationId: 'createMember',
  summary: 'Add a member',
  description: `Adds one member by hand (FR-MEM-01).
- Phones are stored as +233…; unit-scoped executives must choose a unit they reach.`,
  request: {
    body: jsonBody(createMemberSchema, {
      ...MEMBER_EXAMPLE,
      unitId: '7d1e9a3c-2b4f-4c6d-8e0a-1b2c3d4e5f60',
    }),
  },
  responses: {
    201: jsonResponse(
      'The new member.',
      successEnvelope(memberResponseSchema, 'Member created.', 201),
    ),
    ...errorResponses(401, NO_PERMISSION, PARTY_ID_TAKEN, 422),
  },
});
document({
  method: 'get',
  path: '/members/{memberId}',
  operationId: 'getMember',
  summary: 'Get a member',
  description: 'One member within your scope.',
  request: { params: memberParamsSchema },
  responses: {
    200: jsonResponse('The member.', successEnvelope(memberResponseSchema, 'Member retrieved.')),
    ...errorResponses(401, NO_PERMISSION, NO_MEMBER),
  },
});
document({
  method: 'patch',
  path: '/members/{memberId}',
  operationId: 'updateMember',
  summary: 'Update a member',
  description: `Changes the fields sent; \`null\` clears an optional one.
- A new \`unitId\` moves the member and keeps the old unit in history.`,
  request: {
    params: memberParamsSchema,
    body: jsonBody(updateMemberSchema, { phone: '+233201234567', middleName: null }),
  },
  responses: {
    200: jsonResponse(
      'The updated member.',
      successEnvelope(memberResponseSchema, 'Member updated.'),
    ),
    ...errorResponses(401, NO_PERMISSION, NO_MEMBER, PARTY_ID_TAKEN, 422),
  },
});
document({
  method: 'post',
  path: '/members/{memberId}/deactivate',
  operationId: 'deactivateMember',
  summary: 'Deactivate a member',
  description: `Stops broadcasts reaching the member; the record is kept.
- An executive must have their appointments ended first (409).`,
  request: { params: memberParamsSchema },
  responses: {
    200: jsonResponse('The member.', successEnvelope(memberResponseSchema, 'Member deactivated.')),
    ...errorResponses(401, NO_PERMISSION, NO_MEMBER, [
      409,
      'The member holds an executive account.',
      'This member is an executive. End their appointments before deactivating them.',
    ]),
  },
});
document({
  method: 'post',
  path: '/members/{memberId}/reactivate',
  operationId: 'reactivateMember',
  summary: 'Reactivate a member',
  description: 'Makes a deactivated member a broadcast recipient again.',
  request: { params: memberParamsSchema },
  responses: {
    200: jsonResponse('The member.', successEnvelope(memberResponseSchema, 'Member reactivated.')),
    ...errorResponses(401, NO_PERMISSION, NO_MEMBER),
  },
});
