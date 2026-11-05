import { Router } from 'express';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  messageEnvelope,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { templatesController as c } from './templates_controller';
import {
  createTemplateSchema,
  listTemplatesSchema,
  templateParamsSchema,
  templateResponseSchema,
  updateTemplateSchema,
} from './templates_schemas';

export const templatesRouter = Router();

const params = validate({ params: templateParamsSchema });

// The SRS names no template permission, so drafting rights cover reading and managing them.
templatesRouter.use(authenticate, authorize({ permission: 'broadcast.draft' }));

templatesRouter.get('/', validate({ query: listTemplatesSchema }), c.list);
templatesRouter.post('/', validate({ body: createTemplateSchema }), c.create);
templatesRouter.get('/:templateId', params, c.get);
templatesRouter.patch(
  '/:templateId',
  validate({ params: templateParamsSchema, body: updateTemplateSchema }),
  c.update,
);
templatesRouter.delete('/:templateId', params, c.archive);

const tags = ['Templates'];
const security = [{ [bearerAuth.name]: [] }];
const NOT_DRAFTER: [number, string] = [
  403,
  'No broadcast.draft permission, or not an executive of an organisation.',
];
const NO_TEMPLATE: [number, string, string] = [
  404,
  'No active template with this id in your organisation.',
  'Template not found.',
];
const NAME_TAKEN: [number, string, string] = [
  409,
  'An active template in your organisation already has this name (ignoring case).',
  'A template with this name already exists.',
];
const BODY_EXAMPLE =
  'Dear {first_name}, our monthly meeting is on {meeting_date} at {meeting_location}.';

openApiRegistry.registerPath({
  method: 'get',
  path: '/templates',
  operationId: 'listTemplates',
  tags,
  summary: 'List message templates',
  description:
    'Active templates of your organisation, most recently updated first. Filter by `category`; `search` matches the name or body.',
  security,
  request: { query: listTemplatesSchema },
  responses: {
    200: jsonResponse(
      'A page of templates.',
      successEnvelope(paginatedSchema(templateResponseSchema), 'Templates retrieved.'),
    ),
    ...errorResponses(401, NOT_DRAFTER, 422),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/templates/{templateId}',
  operationId: 'getTemplate',
  tags,
  summary: 'Get a message template',
  description: 'One active template of your organisation.',
  security,
  request: { params: templateParamsSchema },
  responses: {
    200: jsonResponse(
      'The template.',
      successEnvelope(templateResponseSchema, 'Template retrieved.'),
    ),
    ...errorResponses(401, NOT_DRAFTER, NO_TEMPLATE, 422),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/templates',
  operationId: 'createTemplate',
  tags,
  summary: 'Create a message template',
  description: `
Saves a reusable message for your organisation.

- Personalisation fields: only \`{first_name}\`, \`{meeting_date}\` and \`{meeting_location}\`; any other \`{…}\` is a 422 on \`body\`.
- \`fields\` in the response lists the fields the body uses.
`,
  security,
  request: {
    body: jsonBody(createTemplateSchema, {
      name: 'Monthly meeting',
      category: 'meeting_announcement',
      body: BODY_EXAMPLE,
    }),
  },
  responses: {
    201: jsonResponse(
      'The new template.',
      successEnvelope(templateResponseSchema, 'Template created.', 201),
    ),
    ...errorResponses(401, NOT_DRAFTER, NAME_TAKEN, 422),
  },
});
openApiRegistry.registerPath({
  method: 'patch',
  path: '/templates/{templateId}',
  operationId: 'updateTemplate',
  tags,
  summary: 'Update a message template',
  description:
    'Changes the name, category or body; send at least one. The same field rules as creating apply.',
  security,
  request: {
    params: templateParamsSchema,
    body: jsonBody(updateTemplateSchema, {
      name: 'Monthly meeting reminder',
      category: 'reminder',
    }),
  },
  responses: {
    200: jsonResponse(
      'The updated template.',
      successEnvelope(templateResponseSchema, 'Template updated.'),
    ),
    ...errorResponses(401, NOT_DRAFTER, NO_TEMPLATE, NAME_TAKEN, 422),
  },
});
openApiRegistry.registerPath({
  method: 'delete',
  path: '/templates/{templateId}',
  operationId: 'archiveTemplate',
  tags,
  summary: 'Archive a message template',
  description:
    'Removes the template from lists. The record is kept for history, and its name can be used again.',
  security,
  request: { params: templateParamsSchema },
  responses: {
    200: jsonResponse('Archived.', messageEnvelope('Template archived.')),
    ...errorResponses(401, NOT_DRAFTER, NO_TEMPLATE, 422),
  },
});
