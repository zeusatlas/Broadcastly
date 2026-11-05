import type { Request } from 'express';
import { z } from 'zod';

import { ValidationError } from '../errors/app_error';

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

// The optional Idempotency-Key header on money and dispatch writes (FR-SMS-14, NFR-REL-03).
export function idempotencyKeyOf(req: Request): string | null {
  const header = req.get('Idempotency-Key');
  if (header === undefined) return null;
  const parsed = idempotencyKeySchema.safeParse(header);
  if (!parsed.success) {
    throw new ValidationError(
      { 'Idempotency-Key': ['Use 8 to 100 letters, digits, - or _.'] },
      'The Idempotency-Key header is invalid.',
    );
  }
  return parsed.data;
}
