import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import {
  DUPLICATE_MATCHES,
  IMPORT_RESOLUTIONS,
  IMPORT_ROW_OUTCOMES,
  IMPORT_ROW_STATUSES,
  MEMBER_IMPORT_FILE_TYPES,
  MEMBER_IMPORT_STATUSES,
  type ImportRowParams,
  type ListImportRowsRequest,
  type MemberImportParams,
  type ResolveImportRowRequest,
  type StartMemberImportRequest,
} from './member_import_types';

export const listMemberImportsSchema = pageQuerySchema;

export const startMemberImportSchema = z.object({
  defaultUnitId: z
    .union([z.uuid(), z.literal('')])
    .optional()
    .transform((value) => value || undefined),
}) satisfies z.ZodType<StartMemberImportRequest, unknown>;

export const memberImportParamsSchema = z.object({
  importId: z.uuid(),
}) satisfies z.ZodType<MemberImportParams>;

export const importRowParamsSchema = memberImportParamsSchema.extend({
  rowId: z.uuid(),
}) satisfies z.ZodType<ImportRowParams>;

export const listImportRowsSchema = pageQuerySchema.extend({
  filter: z.enum(IMPORT_ROW_STATUSES).optional(),
}) satisfies z.ZodType<ListImportRowsRequest>;

export const resolveImportRowSchema = z
  .object({ resolution: z.enum(IMPORT_RESOLUTIONS) })
  .openapi('ResolveImportRowRequest') satisfies z.ZodType<ResolveImportRowRequest>;

export const memberImportResponseSchema = z
  .object({
    id: z.uuid(),
    fileName: z.string().openapi({ example: 'north-branch-members.xlsx' }),
    fileSize: z.number().int().openapi({ example: 48213 }),
    fileType: z.enum(MEMBER_IMPORT_FILE_TYPES),
    status: z.enum(MEMBER_IMPORT_STATUSES),
    failureReason: z.string().nullable().openapi({ example: null }),
    defaultUnitId: z.uuid().nullable(),
    defaultUnitName: z.string().nullable().openapi({ example: 'North Branch' }),
    uploadedBy: z.string().nullable().openapi({ example: 'Kofi Mensah' }),
    counts: z.object({
      total: z.number().int().openapi({ example: 120 }),
      valid: z.number().int().openapi({ example: 110 }),
      invalid: z.number().int().openapi({ example: 6 }),
      duplicates: z.number().int().openapi({ example: 4 }),
      accepted: z.number().int().openapi({ example: 112 }),
      created: z.number().int().openapi({ example: 0 }),
      updated: z.number().int().openapi({ example: 0 }),
      skipped: z.number().int().openapi({ example: 0 }),
      rejected: z.number().int().openapi({ example: 0 }),
    }),
    createdAt: z.iso.datetime(),
    parsedAt: z.iso.datetime().nullable(),
    confirmedAt: z.iso.datetime().nullable(),
    completedAt: z.iso.datetime().nullable(),
    cancelledAt: z.iso.datetime().nullable(),
  })
  .openapi('MemberImportResponse');

export const importRowResponseSchema = z
  .object({
    id: z.uuid(),
    rowNumber: z.number().int().openapi({ example: 14 }),
    status: z.enum(IMPORT_ROW_STATUSES),
    values: z.record(z.string(), z.string()).openapi({
      example: {
        firstName: 'Akosua',
        lastName: 'Boateng',
        phone: '+233241234567',
        unit: 'North Branch',
      },
    }),
    errors: z
      .record(z.string(), z.array(z.string()))
      .openapi({ example: { phone: ['Not a valid Ghanaian phone number.'] } }),
    duplicate: z
      .object({
        matchedOn: z.enum(DUPLICATE_MATCHES),
        memberId: z.uuid().nullable(),
        memberName: z.string().nullable().openapi({ example: 'Akosua Boateng' }),
        unitName: z.string().nullable().openapi({ example: 'North Branch' }),
        rowNumber: z.number().int().nullable().openapi({ example: null }),
      })
      .nullable(),
    resolution: z.enum(IMPORT_RESOLUTIONS).nullable(),
    outcome: z.enum(IMPORT_ROW_OUTCOMES).nullable(),
  })
  .openapi('ImportRowResponse');
