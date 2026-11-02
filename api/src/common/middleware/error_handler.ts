import type { NextFunction, Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { z } from 'zod';

import { logger } from '../../config/logger';
import { AppError, ConflictError, ValidationError } from '../errors/app_error';
import { RESPONSE_STATUS, type ErrorResponse } from '../http/api_response';

import { toErrorMessages } from './validate';

const INTERNAL_MESSAGE = 'Something went wrong on our end. Please try again.';
const PG_UNIQUE_VIOLATION = '23505';

interface HttpParserError extends Error {
  status?: number;
  type?: string;
}

// Maps anything thrown to an AppError. Unknown errors become a generic 500: database text,
// stack traces and driver messages never reach the client.
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof z.ZodError) return new ValidationError(toErrorMessages(error));

  if (error instanceof QueryFailedError) {
    const code = (error.driverError as { code?: string } | undefined)?.code;
    if (code === PG_UNIQUE_VIOLATION) return new ConflictError('This record already exists.');
  }

  const parserError = error as HttpParserError;
  if (parserError.type === 'entity.parse.failed') {
    return new AppError('The request body is not valid JSON.', 400);
  }
  if (parserError.type === 'entity.too.large') {
    return new AppError('The request body is too large.', 413);
  }

  return new AppError(INTERNAL_MESSAGE, 500, { cause: error });
}

// Express recognises an error handler by its four parameters, so `_next` must stay.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    logger.error({ err: appError.cause ?? appError, reqId: req.id }, 'Unhandled error');
  }

  const body: ErrorResponse = {
    status: RESPONSE_STATUS.error,
    status_code: appError.statusCode,
    message: appError.message,
    errors: appError.errors,
  };

  res.status(appError.statusCode).json(body);
}
