import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { checkPeriod, periodQueryShape } from '../../common/http/period';

import {
  CREDIT_PURCHASE_STATUSES,
  CREDIT_TRANSACTION_TYPES,
  type CreateAllocationRequest,
  type CreatePurchaseRequest,
  type ListAllocationRecipientsRequest,
  type ListAllocationsRequest,
  type ListCreditTransactionsRequest,
  type ListPurchasesRequest,
} from './credits_types';

export const MAX_CREDITS_PER_PURCHASE = 1_000_000;
export const MAX_CREDITS_PER_ALLOCATION = 1_000_000;

export const createAllocationSchema = z
  .object({
    executiveId: z.uuid('Choose who receives the credits.'),
    credits: z
      .number('Enter the number of credits.')
      .int('Use a whole number of credits.')
      .min(1, 'Allocate at least 1 credit.')
      .max(MAX_CREDITS_PER_ALLOCATION, 'That is more than one allocation allows.'),
    reason: z
      .string()
      .trim()
      .max(200, 'Keep the reason under 200 characters.')
      .optional()
      .transform((value) => value || undefined),
  })
  .openapi('CreateAllocationRequest') satisfies z.ZodType<CreateAllocationRequest>;

export const listAllocationsSchema = pageQuerySchema
  .extend(periodQueryShape)
  .superRefine(checkPeriod) satisfies z.ZodType<ListAllocationsRequest>;

export const listAllocationRecipientsSchema = pageQuerySchema.extend({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
}) satisfies z.ZodType<ListAllocationRecipientsRequest>;

export const createPurchaseSchema = z
  .object({
    credits: z
      .number('Enter the number of credits.')
      .int('Use a whole number of credits.')
      .min(1, 'Buy at least 1 credit.')
      .max(MAX_CREDITS_PER_PURCHASE, 'That is more than one purchase allows.'),
  })
  .openapi('CreatePurchaseRequest') satisfies z.ZodType<CreatePurchaseRequest>;

export const listPurchasesSchema = pageQuerySchema
  .extend({ status: z.enum(CREDIT_PURCHASE_STATUSES).optional(), ...periodQueryShape })
  .superRefine(checkPeriod) satisfies z.ZodType<ListPurchasesRequest>;

export const listCreditTransactionsSchema = pageQuerySchema
  .extend({
    wallet: z.enum(['mine', 'organisation']).default('mine'),
    type: z.enum(CREDIT_TRANSACTION_TYPES).optional(),
    ...periodQueryShape,
  })
  .superRefine(checkPeriod) satisfies z.ZodType<ListCreditTransactionsRequest>;

export const walletBalanceSchema = z
  .object({
    balance: z.number().int().openapi({ example: 12450 }),
    reserved: z.number().int().openapi({ example: 320 }),
    available: z.number().int().openapi({ example: 12130 }),
  })
  .openapi('WalletBalance');

export const creditBalancesResponseSchema = z
  .object({ organisation: walletBalanceSchema.nullable(), mine: walletBalanceSchema })
  .openapi('CreditBalancesResponse');

export const purchaseResponseSchema = z
  .object({
    id: z.uuid(),
    organisationId: z.uuid(),
    organisationName: z.string().openapi({ example: 'Central Constituency' }),
    reference: z.string().openapi({ example: 'BCP-3F2A9C1D7E4B' }),
    credits: z.number().int().openapi({ example: 10000 }),
    amountPesewas: z.number().int().openapi({ example: 40000 }),
    currency: z.literal('GHS'),
    status: z.enum(CREDIT_PURCHASE_STATUSES).openapi({ example: 'pending' }),
    provider: z.string().openapi({ example: 'simulate' }),
    checkoutUrl: z.url().nullable(),
    failureReason: z.string().nullable(),
    initiatedBy: z.string().nullable().openapi({ example: 'Kofi Asante' }),
    completedAt: z.iso.datetime().nullable(),
    failedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('PurchaseResponse');

export const creditTransactionResponseSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(CREDIT_TRANSACTION_TYPES).openapi({ example: 'purchase' }),
    amount: z.number().int().openapi({ example: 10000 }),
    balanceAfter: z.number().int().openapi({ example: 12450 }),
    reason: z.string().nullable(),
    initiatedBy: z.string().nullable(),
    purchaseId: z.uuid().nullable(),
    broadcastId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('CreditTransactionResponse');

export const allocationResponseSchema = z
  .object({
    id: z.uuid(),
    executiveId: z.uuid(),
    executiveName: z.string().openapi({ example: 'Ama Mensah' }),
    credits: z.number().int().openapi({ example: 500 }),
    reason: z.string().nullable().openapi({ example: 'Branch meeting reminders' }),
    initiatedBy: z.string().nullable().openapi({ example: 'Kofi Asante' }),
    createdAt: z.iso.datetime(),
  })
  .openapi('AllocationResponse');

export const allocationRecipientResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Ama Mensah' }),
    positions: z.array(
      z.object({
        title: z.string().openapi({ example: 'Branch Secretary' }),
        unitName: z.string().nullable().openapi({ example: 'North Branch' }),
      }),
    ),
    wallet: walletBalanceSchema,
  })
  .openapi('AllocationRecipientResponse');

export const simulatedPaymentEventSchema = z
  .object({
    reference: z.string().openapi({ example: 'BCP-3F2A9C1D7E4B' }),
    outcome: z.enum(['paid', 'failed']),
    reason: z.string().optional(),
  })
  .openapi('SimulatedPaymentEvent');
