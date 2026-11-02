import { rateLimit, type Options } from 'express-rate-limit';

import { TooManyRequestsError } from '../errors/app_error';

// TODO(deployment): in-memory counters are per process. Add a Redis store before running
// more than one API instance, or limits multiply by the instance count.
const shared: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new TooManyRequestsError()),
};

export const apiRateLimit = rateLimit({ ...shared, windowMs: 15 * 60 * 1000, limit: 300 });

// Sign-in, refresh and recovery: slows credential stuffing and OTP guessing (FR-AUTH-02).
export const authRateLimit = rateLimit({ ...shared, windowMs: 15 * 60 * 1000, limit: 10 });
