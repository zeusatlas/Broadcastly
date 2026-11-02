import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { createExecutiveSchema, EXECUTIVE_STATUSES, USER_ROLES } from '../auth';
import { UNIT_STATUSES } from '../organisation';

import type {
  ConstituencyParams,
  CreateConstituencyRequest,
  ExecutiveParams,
  ListConstituenciesRequest,
  NewExecutiveRequest,
} from './platform_types';

// ── Requests ────────────────────────────────────────────────────────────────

export const createConstituencySchema = z
  .object({
    // Inner whitespace collapsed, so "Central  North" and "Central North" count as the same name.
    name: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, ' '))
      .pipe(z.string().min(2, 'Enter at least 2 characters.').max(150)),
  })
  .openapi('CreateConstituencyRequest') satisfies z.ZodType<CreateConstituencyRequest>;

export const listConstituenciesSchema = pageQuerySchema.extend({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
}) satisfies z.ZodType<ListConstituenciesRequest>;

export const newExecutiveSchema = createExecutiveSchema
  .omit({ role: true })
  .openapi('NewExecutiveRequest') satisfies z.ZodType<NewExecutiveRequest>;

export const constituencyParamsSchema = z.object({
  constituencyId: z.uuid('Not a valid constituency id.'),
}) satisfies z.ZodType<ConstituencyParams>;

export const executiveParamsSchema = z.object({
  executiveId: z.uuid('Not a valid account id.'),
}) satisfies z.ZodType<ExecutiveParams>;

// ── Responses (documentation only) ──────────────────────────────────────────

export const executiveSummaryResponseSchema = z
  .object({
    id: z.uuid(),
    memberId: z.uuid(),
    fullName: z.string().openapi({ example: 'Kofi Asante' }),
    email: z.string().openapi({ example: 'kofi.asante@example.com' }),
    phone: z.string().nullable().openapi({ example: '+233241234567' }),
    role: z.enum(USER_ROLES).openapi({ example: 'constituency_chairman' }),
    status: z.enum(EXECUTIVE_STATUSES).openapi({ example: 'active' }),
    lastSignInAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('ExecutiveSummaryResponse');

const chairmanResponseSchema = executiveSummaryResponseSchema
  .extend({ appointmentId: z.uuid(), appointedAt: z.iso.datetime() })
  .openapi('ChairmanResponse');

export const constituencyResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Central Constituency' }),
    status: z.enum(UNIT_STATUSES).openapi({ example: 'active' }),
    chairman: chairmanResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('ConstituencyResponse');

export const platformOverviewResponseSchema = z
  .object({
    constituencies: z.number().int().openapi({ example: 12 }),
    constituenciesWithoutChairman: z.number().int().openapi({ example: 2 }),
    activeChairmen: z.number().int().openapi({ example: 10 }),
    activeExecutives: z.number().int().openapi({ example: 184 }),
    platformAdmins: z.number().int().openapi({ example: 3 }),
  })
  .openapi('PlatformOverviewResponse');
