import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { checkPeriod, periodQueryShape } from '../../common/http/period';
import { createExecutiveSchema, EXECUTIVE_STATUSES, PLATFORM_ADMIN_STATUSES } from '../auth';
import { BROADCAST_STATUSES } from '../broadcasts';
import { CREDIT_PURCHASE_STATUSES, walletBalanceSchema } from '../credits';
import { CREDIT_TRANSACTION_TYPES, creditTransactionResponseSchema } from '../credits';
import { ORGANISATION_STATUSES } from '../organisation';

import type {
  AppointChairmanRequest,
  CreateOrganisationRequest,
  ListBroadcastsRequest,
  ListOrganisationBroadcastsRequest,
  ListOrganisationCreditTransactionsRequest,
  ListPlatformPurchasesRequest,
  ListOrganisationExecutivesRequest,
  ListOrganisationsRequest,
  ListPlatformAdminsRequest,
  ListPlatformCreditTransactionsRequest,
  CreateCreditAdjustmentRequest,
  PlatformAuditLogRequest,
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

export const listBroadcastsSchema = pageQuerySchema
  .extend({
    organisationId: z.uuid('Not a valid organisation id.').optional(),
    status: z.enum(BROADCAST_STATUSES).optional(),
    search: searchSchema,
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<ListBroadcastsRequest>;

export const listOrganisationBroadcastsSchema = pageQuerySchema
  .extend({
    status: z.enum(BROADCAST_STATUSES).optional(),
    search: searchSchema,
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<ListOrganisationBroadcastsRequest>;

export const listPlatformPurchasesSchema = pageQuerySchema
  .extend({
    organisationId: z.uuid('Not a valid organisation id.').optional(),
    status: z.enum(CREDIT_PURCHASE_STATUSES).optional(),
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<ListPlatformPurchasesRequest>;

export const listOrganisationCreditTransactionsSchema = pageQuerySchema
  .extend(periodQueryShape)
  .superRefine(checkPeriod) satisfies z.ZodType<ListOrganisationCreditTransactionsRequest>;

export const periodQuerySchema = z.object(periodQueryShape).superRefine(checkPeriod);

export const listAuditLogSchema = pageQuerySchema
  .extend({
    actor: searchSchema,
    action: searchSchema,
    organisationId: z.uuid('Not a valid organisation id.').optional(),
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<PlatformAuditLogRequest>;

export const auditEventResponseSchema = z
  .object({
    id: z.uuid(),
    actor: z.string().nullable(),
    actorRole: z.enum(['executive', 'platform_admin']).nullable(),
    action: z.string(),
    outcome: z.enum(['success', 'failure']),
    organisationId: z.uuid().nullable(),
    organisationName: z.string().nullable(),
    targetType: z.string().nullable(),
    targetId: z.uuid().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    createdAt: z.iso.datetime(),
  })
  .openapi('AuditEventResponse');

export const listPlatformCreditTransactionsSchema = pageQuerySchema
  .extend({
    organisationId: z.uuid('Not a valid organisation id.').optional(),
    type: z.enum(CREDIT_TRANSACTION_TYPES).optional(),
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<ListPlatformCreditTransactionsRequest>;

export const platformCreditTransactionResponseSchema = creditTransactionResponseSchema
  .extend({
    organisationId: z.uuid(),
    organisationName: z.string(),
  })
  .openapi('PlatformCreditTransactionResponse');

export const createCreditAdjustmentSchema = z
  .object({
    organisationId: z.uuid('Not a valid organisation id.'),
    amount: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, {
      message: 'Amount cannot be zero.',
    }),
    reason: z.string().trim().min(2).max(255),
  })
  .openapi('CreateCreditAdjustmentRequest') satisfies z.ZodType<CreateCreditAdjustmentRequest>;

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
    creditBalance: z.number().int().openapi({ example: 500 }),
  })
  .openapi('OrganisationExecutiveResponse');

const headResponseSchema = z
  .object({ ...executiveFields, appointmentId: z.uuid(), appointedAt: z.iso.datetime() })
  .openapi('HeadResponse');

export const organisationResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Central Constituency' }),
    type: z.string().openapi({ example: 'constituency' }),
    status: z.enum(ORGANISATION_STATUSES).openapi({ example: 'active' }),
    logoUrl: z
      .url()
      .nullable()
      .openapi({ example: 'https://api.example.com/uploads/organisation-logos/3f2a.png' }),
    credits: walletBalanceSchema,
    headTitle: z.string().openapi({ example: 'Head' }),
    head: headResponseSchema.nullable(),
    memberCount: z.number().int().openapi({ example: 8412 }),
    executiveCount: z.number().int().openapi({ example: 37 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('OrganisationResponse');

const purchaseSummaryFields = {
  creditsPurchased: z.number().int().openapi({ example: 250000 }),
  amountPaidPesewas: z.number().int().openapi({ example: 1000000 }),
  pendingPurchases: z.number().int().openapi({ example: 2 }),
  failedPurchases: z.number().int().openapi({ example: 1 }),
};

export const platformOverviewResponseSchema = z
  .object({
    organisations: z.number().int().openapi({ example: 12 }),
    suspendedOrganisations: z.number().int().openapi({ example: 1 }),
    organisationsWithoutHead: z.number().int().openapi({ example: 2 }),
    members: z.number().int().openapi({ example: 96210 }),
    activeHeads: z.number().int().openapi({ example: 10 }),
    activeExecutives: z.number().int().openapi({ example: 184 }),
    suspendedExecutives: z.number().int().openapi({ example: 3 }),
    platformAdmins: z.number().int().openapi({ example: 2 }),
    ...purchaseSummaryFields,
  })
  .openapi('PlatformOverviewResponse');

export const purchaseSummaryResponseSchema = z
  .object(purchaseSummaryFields)
  .openapi('PurchaseSummaryResponse');
