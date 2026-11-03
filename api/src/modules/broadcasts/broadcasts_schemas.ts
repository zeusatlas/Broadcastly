import { z } from 'zod';

import '../../config/openapi';

import { BROADCAST_STATUSES } from './broadcasts_types';

// Request schemas arrive with drafting and dispatch; this is the read shape lists return.
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
