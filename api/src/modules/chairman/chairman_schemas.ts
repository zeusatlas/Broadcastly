import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { createExecutiveSchema, EXECUTIVE_STATUSES, PERMISSIONS } from '../auth';
import { UNIT_STATUSES } from '../organisation';

import type {
  AppointmentParams,
  AppointmentRequest,
  CreateOrganisationExecutiveRequest,
  CreatePositionRequest,
  CreateUnitRequest,
  EndAppointmentRequest,
  ExecutiveParams,
  ListExecutivesRequest,
  ListUnitsRequest,
  PositionParams,
  UpdatePositionRequest,
  UpdateOrganisationNotificationPreferencesRequest,
} from './chairman_types';

// Inner whitespace collapsed, so "Branch  Chairman" and "Branch Chairman" count as the same name.
const labelSchema = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(2, 'Enter at least 2 characters.').max(max));

const typeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z_]{2,40}$/, 'Use letters and underscores, e.g. polling_station.');

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

export const createPositionSchema = z
  .object({ title: labelSchema(120), unitType: typeSchema.default('organisation') })
  .openapi('CreatePositionRequest') satisfies z.ZodType<CreatePositionRequest>;

export const updatePositionSchema = z
  .object({ title: labelSchema(120).optional(), isActive: z.boolean().optional() })
  .refine((body) => body.title !== undefined || body.isActive !== undefined, {
    message: 'Send a title or isActive.',
  })
  .openapi('UpdatePositionRequest') satisfies z.ZodType<UpdatePositionRequest>;

export const listUnitsSchema = pageQuerySchema.extend({
  parentId: z.uuid('Not a valid unit id.').optional(),
  search: searchSchema,
}) satisfies z.ZodType<ListUnitsRequest>;

export const createUnitSchema = z
  .object({
    name: labelSchema(150),
    type: typeSchema,
    parentId: z.uuid('Not a valid unit id.').optional(),
  })
  .openapi('CreateUnitRequest') satisfies z.ZodType<CreateUnitRequest>;

const appointmentFields = {
  positionId: z.uuid('Not a valid position id.'),
  unitId: z.uuid('Not a valid unit id.').optional(),
  permissions: z
    .array(z.enum(PERMISSIONS))
    .max(PERMISSIONS.length)
    .default([])
    .transform((values) => [...new Set(values)]),
};

export const appointmentSchema = z
  .object(appointmentFields)
  .openapi('AppointmentRequest') satisfies z.ZodType<AppointmentRequest>;

export const createOrganisationExecutiveSchema = createExecutiveSchema
  .omit({ organisationId: true })
  .extend(appointmentFields)
  .openapi(
    'CreateOrganisationExecutiveRequest',
  ) satisfies z.ZodType<CreateOrganisationExecutiveRequest>;

export const endAppointmentSchema = z
  .object({ reason: z.string().trim().max(255).optional() })
  .default({})
  .openapi('EndAppointmentRequest') satisfies z.ZodType<EndAppointmentRequest>;

export const updateNotificationPreferencesSchema = z
  .object({
    security: z.boolean().optional(),
    approvals: z.boolean().optional(),
    broadcasts: z.boolean().optional(),
    imports: z.boolean().optional(),
    digest: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one preference.' })
  .openapi(
    'UpdateOrganisationNotificationPreferencesRequest',
  ) satisfies z.ZodType<UpdateOrganisationNotificationPreferencesRequest>;

export const notificationPreferencesResponseSchema = z
  .object({
    security: z.boolean(),
    approvals: z.boolean(),
    broadcasts: z.boolean(),
    imports: z.boolean(),
    digest: z.boolean(),
  })
  .openapi('OrganisationNotificationPreferencesResponse');

export const listExecutivesSchema = pageQuerySchema.extend({
  search: searchSchema,
  status: z.enum(EXECUTIVE_STATUSES).optional(),
}) satisfies z.ZodType<ListExecutivesRequest>;

export const positionParamsSchema = z.object({
  positionId: z.uuid('Not a valid position id.'),
}) satisfies z.ZodType<PositionParams>;

export const executiveParamsSchema = z.object({
  executiveId: z.uuid('Not a valid account id.'),
}) satisfies z.ZodType<ExecutiveParams>;

export const appointmentParamsSchema = z.object({
  appointmentId: z.uuid('Not a valid appointment id.'),
}) satisfies z.ZodType<AppointmentParams>;

export const organisationOverviewResponseSchema = z
  .object({
    members: z.number().int().nullable().openapi({ example: 8412 }),
    activeExecutives: z.number().int().openapi({ example: 143 }),
    suspendedExecutives: z.number().int().openapi({ example: 3 }),
    positions: z.number().int().openapi({ example: 12 }),
    units: z.number().int().openapi({ example: 66 }),
    unitsByType: z
      .object({ type: z.string(), count: z.number().int() })
      .array()
      .openapi({
        example: [
          { type: 'polling_station', count: 62 },
          { type: 'branch', count: 4 },
        ],
      }),
  })
  .openapi('OrganisationOverviewResponse');

export const positionResponseSchema = z
  .object({
    id: z.uuid(),
    title: z.string().openapi({ example: 'Constituency Organiser' }),
    unitType: z.string().openapi({ example: 'organisation' }),
    isActive: z.boolean(),
    isBuiltIn: z.boolean().openapi({ example: false }),
    holderCount: z.number().int().openapi({ example: 1 }),
  })
  .openapi('PositionResponse');

export const unitResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Asafo Branch' }),
    type: z.string().openapi({ example: 'branch' }),
    parentId: z.uuid().nullable(),
    status: z.enum(UNIT_STATUSES).openapi({ example: 'active' }),
    childCount: z.number().int().openapi({ example: 4 }),
  })
  .openapi('UnitResponse');

export const executiveResponseSchema = z
  .object({
    id: z.uuid(),
    memberId: z.uuid(),
    partyId: z.string().nullable().openapi({ example: 'M-004512' }),
    fullName: z.string().openapi({ example: 'Kofi Asante' }),
    email: z.string().openapi({ example: 'kofi.asante@example.com' }),
    phone: z.string().nullable().openapi({ example: '+233241234567' }),
    status: z.enum(EXECUTIVE_STATUSES).openapi({ example: 'active' }),
    appointments: z.array(
      z.object({
        id: z.uuid(),
        positionId: z.uuid(),
        positionTitle: z.string().openapi({ example: 'Branch Chairman' }),
        unitId: z.uuid().nullable(),
        unitName: z.string().nullable().openapi({ example: 'Asafo Branch' }),
        permissions: z.array(z.enum(PERMISSIONS)).openapi({ example: ['member.manage'] }),
        effectiveFrom: z.iso.datetime(),
      }),
    ),
    lastSignInAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('ExecutiveResponse');
