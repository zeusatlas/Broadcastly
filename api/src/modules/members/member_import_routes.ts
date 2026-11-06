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
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { spreadsheetUpload } from './import_upload';
import { memberImportController as c } from './member_import_controller';
import {
  importRowParamsSchema,
  importRowResponseSchema,
  listImportRowsSchema,
  listMemberImportsSchema,
  memberImportParamsSchema,
  memberImportResponseSchema,
  resolveImportRowSchema,
  startMemberImportSchema,
} from './member_import_schemas';

// A factory for the same reason as createMembersRouter: auth is only complete once routes.ts runs.
export function createMemberImportsRouter() {
  const router = Router();
  const anImport = validate({ params: memberImportParamsSchema });
  router.use(authenticate, authorize({ permission: 'member.import' }));

  router.get('/template', c.template);
  router.get('/', validate({ query: listMemberImportsSchema }), c.list);
  router.post('/', spreadsheetUpload(), validate({ body: startMemberImportSchema }), c.start);
  router.get('/:importId', anImport, c.get);
  router.get(
    '/:importId/rows',
    validate({ params: memberImportParamsSchema, query: listImportRowsSchema }),
    c.listRows,
  );
  router.post(
    '/:importId/rows/:rowId/resolution',
    validate({ params: importRowParamsSchema, body: resolveImportRowSchema }),
    c.resolveRow,
  );
  router.post('/:importId/confirm', anImport, c.confirm);
  router.post('/:importId/cancel', anImport, c.cancel);
  return router;
}

type RouteDoc = Omit<Parameters<typeof openApiRegistry.registerPath>[0], 'tags' | 'security'>;
type ErrorSpec = Parameters<typeof errorResponses>[number];

const NO_PERMISSION: ErrorSpec = [403, 'No member.import permission.'];
const NO_IMPORT: ErrorSpec = [
  404,
  'No such import, or it was uploaded by someone else and you are not organisation-wide.',
  'Import not found.',
];
const IMPORT = successEnvelope(memberImportResponseSchema, 'Import retrieved.');

function document(route: RouteDoc) {
  openApiRegistry.registerPath({
    ...route,
    tags: ['Members'],
    security: [{ [bearerAuth.name]: [] }],
  });
}

document({
  method: 'get',
  path: '/members/imports/template',
  operationId: 'downloadMemberImportTemplate',
  summary: 'Download the import template',
  description: `A CSV file with the import columns (FR-MEM-03); required ones end in "(required)".
- Columns: First name, Middle name, Last name, Member ID, Phone, Date of birth (YYYY-MM-DD), Unit.`,
  responses: {
    200: {
      description: 'The template file.',
      content: {
        'text/csv': {
          schema: z.string().openapi({
            example:
              'First name (required),Middle name,Last name (required),Member ID,Phone,Date of birth,Unit',
          }),
        },
      },
    },
    ...errorResponses(401, NO_PERMISSION),
  },
});
document({
  method: 'get',
  path: '/members/imports',
  operationId: 'listMemberImports',
  summary: 'List imports',
  description: `Import history, newest first (FR-MEM-08, FR-MEM-09).
- Organisation-wide executives see every import; others see their own.`,
  request: { query: listMemberImportsSchema },
  responses: {
    200: jsonResponse(
      'A page of imports.',
      successEnvelope(paginatedSchema(memberImportResponseSchema), 'Imports retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, 422),
  },
});
document({
  method: 'post',
  path: '/members/imports',
  operationId: 'startMemberImport',
  summary: 'Upload a spreadsheet',
  description: `Starts an import from a .csv or .xlsx file (multipart field \`file\`); checking runs in the background.
- Poll the import until \`status\` is \`ready\` (or \`failed\`), then review its rows. Nothing is saved yet.
- \`defaultUnitId\` places rows with no Unit cell; unit-scoped executives need one or a Unit column.
- The file type is checked from its content; size and row limits are set per server. The file is deleted once read.`,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.string().openapi({ type: 'string', format: 'binary' }),
            defaultUnitId: z.uuid().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: jsonResponse(
      'The import, still processing.',
      successEnvelope(
        memberImportResponseSchema,
        'Import started. The file is being checked.',
        201,
      ),
    ),
    ...errorResponses(
      401,
      [403, 'No member.import permission, or the default unit is outside your scope.'],
      [
        422,
        'No file, a file that is not a real .csv/.xlsx, a file over the size limit, or an unknown unit.',
        'Upload a .csv or .xlsx file.',
      ],
      [
        503,
        'The job queue is unavailable.',
        'Imports are unavailable right now. Please try again shortly.',
      ],
    ),
  },
});
document({
  method: 'get',
  path: '/members/imports/{importId}',
  operationId: 'getMemberImport',
  summary: 'Get an import',
  description: `Status and counts; poll this while \`status\` is \`processing\` or \`confirming\`.
- \`counts.accepted\` is what a confirm would save; created/updated/skipped/rejected fill in once completed.`,
  request: { params: memberImportParamsSchema },
  responses: {
    200: jsonResponse('The import.', IMPORT),
    ...errorResponses(401, NO_PERMISSION, NO_IMPORT),
  },
});
document({
  method: 'get',
  path: '/members/imports/{importId}/rows',
  operationId: 'listMemberImportRows',
  summary: 'Preview rows',
  description: `The file's rows in order, with their problems (FR-MEM-04..06).
- \`filter\` shows only \`valid\`, \`invalid\` or \`duplicate\` rows.
- A duplicate matches an existing member (by member ID, then phone) or an earlier row (by phone).`,
  request: { params: memberImportParamsSchema, query: listImportRowsSchema },
  responses: {
    200: jsonResponse(
      'A page of rows.',
      successEnvelope(paginatedSchema(importRowResponseSchema), 'Rows retrieved.'),
    ),
    ...errorResponses(401, NO_PERMISSION, NO_IMPORT, 422),
  },
});
document({
  method: 'post',
  path: '/members/imports/{importId}/rows/{rowId}/resolution',
  operationId: 'resolveMemberImportRow',
  summary: 'Decide a duplicate',
  description: `Chooses what a confirm does with one duplicate row; undecided duplicates are skipped.
- \`update_existing\` needs a matching member in your scope; \`create_new\` is refused for a member ID match.`,
  request: {
    params: importRowParamsSchema,
    body: jsonBody(resolveImportRowSchema, { resolution: 'update_existing' }),
  },
  responses: {
    200: jsonResponse('The row.', successEnvelope(importRowResponseSchema, 'Decision saved.')),
    ...errorResponses(
      401,
      [403, 'No member.import permission, or the matched member is outside your scope.'],
      NO_IMPORT,
      [
        409,
        'The import is not ready for review.',
        'Duplicates can only be decided before the import is confirmed.',
      ],
      [
        422,
        'Not a duplicate row, or the decision does not fit it.',
        'Only duplicate rows need a decision.',
      ],
    ),
  },
});
document({
  method: 'post',
  path: '/members/imports/{importId}/confirm',
  operationId: 'confirmMemberImport',
  summary: 'Confirm an import',
  description: `Saves the accepted rows in the background, then the import becomes \`completed\`.
- Safe to repeat: a second call returns the same import and resumes saving if it stopped.
- Imported members get a membership with source \`import\`; no executive accounts are created (FR-MEM-10).`,
  request: { params: memberImportParamsSchema },
  responses: {
    200: jsonResponse(
      'The import.',
      successEnvelope(memberImportResponseSchema, 'Import confirmed. Saving members.'),
    ),
    ...errorResponses(
      401,
      [403, 'No member.import permission, or rows fall outside your scope.'],
      NO_IMPORT,
      [409, 'Still processing, failed or cancelled.', 'This import can no longer be confirmed.'],
      [
        503,
        'The job queue is unavailable.',
        'Saving is delayed. Confirm again in a moment to resume it.',
      ],
    ),
  },
});
document({
  method: 'post',
  path: '/members/imports/{importId}/cancel',
  operationId: 'cancelMemberImport',
  summary: 'Cancel an import',
  description:
    'Stops an import before it is confirmed; nothing from it is saved. Repeating it is harmless.',
  request: { params: memberImportParamsSchema },
  responses: {
    200: jsonResponse(
      'The import.',
      successEnvelope(memberImportResponseSchema, 'Import cancelled.'),
    ),
    ...errorResponses(401, NO_PERMISSION, NO_IMPORT, [
      409,
      'Already confirmed or failed.',
      'This import can no longer be cancelled.',
    ]),
  },
});
