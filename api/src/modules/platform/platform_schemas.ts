import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { createExecutiveSchema, EXECUTIVE_STATUSES, PLATFORM_ADMIN_STATUSES } from '../auth';
import { ORGANISATION_STATUSES } from '../organisation';

import type {
  AppointChairmanRequest,
  CreateOrganisationRequest,
  ListOrganisationExecutivesRequest,
  ListOrganisationsRequest,
  ListPlatformAdminsRequest,
  OrganisationExecutiveParams,
  OrganisationParams,
  PlatformAdminParams,
} from './platform_types';

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

export const createOrganisationSchema = z
  .object({
    // Inner whitespace collapsed, so "Central  North" and "Central North" count as the same name.
    name: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, ' '))
      .pipe(z.string().min(2, 'Enter at least 2 characters.').max(150)),
    type: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z_]{2,40}$/, 'Use letters and underscores, e.g. constituency.')
      .default('constituency'),
  })
  .openapi('CreateOrganisationRequest') satisfies z.ZodType<CreateOrganisationRequest>;

export const listOrganisationsSchema = pageQuerySchema.extend({
  search: searchSchema,
  status: z.enum(ORGANISATION_STATUSES).optional(),
  hasChairman: z.stringbool().optional(),
}) satisfies z.ZodType<ListOrganisationsRequest>;

export const listPlatformAdminsSchema = pageQuerySchema.extend({
  search: searchSchema,
  status: z.enum(PLATFORM_ADMIN_STATUSES).optional(),
}) satisfies z.ZodType<ListPlatformAdminsRequest>;

export const listOrganisationExecutivesSchema = pageQuerySchema.extend({
  search: searchSchema,
  status: z.enum(EXECUTIVE_STATUSES).optional(),
}) satisfies z.ZodType<ListOrganisationExecutivesRequest>;

export const appointChairmanSchema = createExecutiveSchema
  .omit({ organisationId: true })
  .openapi('AppointChairmanRequest') satisfies z.ZodType<AppointChairmanRequest>;

export const organisationParamsSchema = z.object({
  organisationId: z.uuid('Not a valid organisation id.'),
}) satisfies z.ZodType<OrganisationParams>;

export const organisationExecutiveParamsSchema = organisationParamsSchema.extend({
  executiveId: z.uuid('Not a valid account id.'),
}) satisfies z.ZodType<OrganisationExecutiveParams>;

export const platformAdminParamsSchema = z.object({
  platformAdminId: z.uuid('Not a valid account id.'),
}) satisfies z.ZodType<PlatformAdminParams>;

const executiveFields = {
  id: z.uuid(),
  memberId: z.uuid(),
  partyId: z.string().nullable().openapi({ example: 'M-004512' }),
  fullName: z.string().openapi({ example: 'Kofi Asante' }),
  email: z.string().openapi({ example: 'kofi.asante@example.com' }),
  phone: z.string().nullable().openapi({ example: '+233241234567' }),
  status: z.enum(EXECUTIVE_STATUSES).openapi({ example: 'active' }),
  lastSignInAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
};

export const organisationExecutiveResponseSchema = z
  .object({
    ...executiveFields,
    positions: z.array(z.string()).openapi({ example: ['Constituency Organiser'] }),
  })
  .openapi('OrganisationExecutiveResponse');

const chairmanResponseSchema = z
  .object({ ...executiveFields, appointmentId: z.uuid(), appointedAt: z.iso.datetime() })
  .openapi('ChairmanResponse');

export const organisationResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Central Constituency' }),
    type: z.string().openapi({ example: 'constituency' }),
    status: z.enum(ORGANISATION_STATUSES).openapi({ example: 'active' }),
    chairman: chairmanResponseSchema.nullable(),
    memberCount: z.number().int().openapi({ example: 8412 }),
    executiveCount: z.number().int().openapi({ example: 37 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('OrganisationResponse');

export const platformOverviewResponseSchema = z
  .object({
    organisations: z.number().int().openapi({ example: 12 }),
    organisationsWithoutChairman: z.number().int().openapi({ example: 2 }),
    members: z.number().int().openapi({ example: 96210 }),
    activeChairmen: z.number().int().openapi({ example: 10 }),
    activeExecutives: z.number().int().openapi({ example: 184 }),
    suspendedExecutives: z.number().int().openapi({ example: 3 }),
    platformAdmins: z.number().int().openapi({ example: 2 }),
  })
  .openapi('PlatformOverviewResponse');
