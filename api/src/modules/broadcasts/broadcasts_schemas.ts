import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import {
  AUDIENCE_LEVELS,
  BROADCAST_STATUSES,
  type BroadcastAudienceRequest,
  type BroadcastParams,
  type CreateBroadcastRequest,
  type DispatchBroadcastRequest,
  type EstimateBroadcastRequest,
  type ListBroadcastsRequest,
  type UpdateBroadcastRequest,
} from './broadcasts_types';

const MAX_SCHEDULE_DAYS = 90;
// Long enough for any multi-part SMS the providers accept, short enough to stay a broadcast.
const MAX_MESSAGE_LENGTH = 1_530;

const statusesSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
  z.array(z.enum(BROADCAST_STATUSES)).max(BROADCAST_STATUSES.length).optional(),
);

const messageSchema = z.string().trim().min(1, 'Write the message.').max(MAX_MESSAGE_LENGTH);
const titleSchema = z.string().trim().min(1).max(150);

export const audienceSchema = z
  .object({
    level: z.enum(AUDIENCE_LEVELS),
    unitIds: z.array(z.uuid()).max(100).optional(),
  })
  .openapi('BroadcastAudience') satisfies z.ZodType<BroadcastAudienceRequest>;

// A schedule must be in the future and within reach; null clears it (send at once).
const scheduledAtSchema = z.iso
  .datetime({ offset: true, message: 'Use an ISO date and time.' })
  .refine(
    (value) => new Date(value).getTime() > Date.now() + 60_000,
    'Choose a time at least a minute from now.',
  )
  .refine(
    (value) => new Date(value).getTime() < Date.now() + MAX_SCHEDULE_DAYS * 86_400_000,
    `Choose a time within ${MAX_SCHEDULE_DAYS} days.`,
  )
  .nullable();

export const broadcastParamsSchema = z.object({
  broadcastId: z.uuid(),
}) satisfies z.ZodType<BroadcastParams>;

export const listBroadcastsSchema = pageQuerySchema.extend({
  statuses: statusesSchema,
  search: z.string().trim().max(100).optional(),
  mine: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
}) satisfies z.ZodType<ListBroadcastsRequest, unknown>;

export const createBroadcastSchema = z
  .object({
    title: titleSchema.optional(),
    message: messageSchema,
    audience: audienceSchema,
    scheduledAt: scheduledAtSchema.optional(),
  })
  .openapi('CreateBroadcastRequest') satisfies z.ZodType<CreateBroadcastRequest>;

export const updateBroadcastSchema = z
  .object({
    title: titleSchema.nullable().optional(),
    message: messageSchema.optional(),
    audience: audienceSchema.optional(),
    scheduledAt: scheduledAtSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Change at least one detail.' })
  .openapi('UpdateBroadcastRequest') satisfies z.ZodType<UpdateBroadcastRequest>;

export const estimateBroadcastSchema = z
  .object({ message: messageSchema, audience: audienceSchema })
  .openapi('EstimateBroadcastRequest') satisfies z.ZodType<EstimateBroadcastRequest>;

export const dispatchBroadcastSchema = z
  .object({ scheduledAt: scheduledAtSchema.optional() })
  .default({})
  .openapi('DispatchBroadcastRequest') satisfies z.ZodType<DispatchBroadcastRequest, unknown>;

export const broadcastResponseSchema = z
  .object({
    id: z.uuid(),
    organisationId: z.uuid(),
    organisationName: z.string().openapi({ example: 'Central Constituency' }),
    title: z.string().nullable().openapi({ example: 'Executive meeting — Saturday 9am' }),
    message: z.string(),
    status: z.enum(BROADCAST_STATUSES).openapi({ example: 'completed' }),
    audienceSummary: z.string().nullable().openapi({ example: 'Constituency executives' }),
    recipientCount: z.number().int().openapi({ example: 146 }),
    segmentCount: z.number().int().openapi({ example: 2 }),
    estimatedCredits: z.number().int().openapi({ example: 292 }),
    deliveredCount: z.number().int().openapi({ example: 142 }),
    failedCount: z.number().int().openapi({ example: 1 }),
    createdBy: z.string().nullable().openapi({ example: 'Kofi Asante' }),
    scheduledAt: z.iso.datetime().nullable(),
    submittedAt: z.iso.datetime().nullable(),
    completedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('BroadcastResponse');

export const broadcastDetailResponseSchema = broadcastResponseSchema
  .extend({
    createdById: z.uuid(),
    audience: audienceSchema,
    submittedCount: z.number().int().openapi({ example: 145 }),
    sentBy: z.string().nullable().openapi({ example: 'Kofi Asante' }),
    cancelledAt: z.iso.datetime().nullable(),
    latestDecision: z
      .object({
        decision: z.enum(['approved', 'rejected']),
        reason: z.string().nullable().openapi({ example: 'Please add the meeting venue.' }),
        decidedBy: z.string().openapi({ example: 'Ama Mensah' }),
        decidedAt: z.iso.datetime(),
      })
      .nullable(),
  })
  .openapi('BroadcastDetailResponse');

export const broadcastEstimateResponseSchema = z
  .object({
    encoding: z.enum(['GSM-7', 'Unicode']),
    characters: z.number().int().openapi({ example: 212 }),
    segments: z.number().int().openapi({ example: 2 }),
    matched: z.number().int().openapi({ example: 160 }),
    recipientCount: z.number().int().openapi({ example: 146 }),
    duplicateCount: z.number().int().openapi({ example: 6 }),
    invalidCount: z.number().int().openapi({ example: 5 }),
    estimatedCredits: z.number().int().openapi({ example: 292 }),
    wallet: z.object({
      owner: z.enum(['organisation', 'executive']),
      available: z.number().int().openapi({ example: 4_800 }),
    }),
  })
  .openapi('BroadcastEstimateResponse');

export const deliveryReportResponseSchema = z.object({
  updated: z.number().int().openapi({ example: 25 }),
});

// Documents the log driver's callback shape; a real provider's driver reads its own format.
export const deliveryReportRequestSchema = z.object({
  reports: z.array(
    z.object({
      providerReference: z.string(),
      state: z.enum(['delivered', 'failed', 'unknown']),
      error: z.string().optional(),
    }),
  ),
});
