import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';
import { broadcastDetailResponseSchema } from '../broadcasts';

import {
  APPROVAL_DECISIONS,
  APPROVAL_QUEUES,
  type ApprovalParams,
  type ApproveBroadcastRequest,
  type ListApprovalsRequest,
  type RejectBroadcastRequest,
} from './approvals_types';

export const approvalParamsSchema = z.object({
  broadcastId: z.uuid(),
}) satisfies z.ZodType<ApprovalParams>;

export const listApprovalsSchema = pageQuerySchema.extend({
  status: z.enum(APPROVAL_QUEUES).default('pending'),
  search: z.string().trim().max(100).optional(),
}) satisfies z.ZodType<ListApprovalsRequest, unknown>;

export const approveBroadcastSchema = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .default({})
  .openapi('ApproveBroadcastRequest') satisfies z.ZodType<ApproveBroadcastRequest, unknown>;

export const rejectBroadcastSchema = z
  .object({ reason: z.string().trim().min(3, 'Say why, so the author can fix it.').max(500) })
  .openapi('RejectBroadcastRequest') satisfies z.ZodType<RejectBroadcastRequest>;

export const approvalDetailResponseSchema = z
  .object({
    broadcast: broadcastDetailResponseSchema,
    decisions: z.array(
      z.object({
        decision: z.enum(APPROVAL_DECISIONS),
        reason: z.string().nullable().openapi({ example: 'Please add the venue.' }),
        decidedBy: z.string().openapi({ example: 'Ama Mensah' }),
        decidedAt: z.iso.datetime(),
      }),
    ),
    walletAvailable: z.number().int().openapi({ example: 4_800 }),
    canDecide: z.boolean(),
  })
  .openapi('ApprovalDetailResponse');
