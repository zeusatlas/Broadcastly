import type { ErrorMessages } from '../http/api_response';

interface AppErrorOptions {
  errors?: ErrorMessages;
  cause?: unknown;
}

// Throw these from services. The error handler turns them into the ErrorResponse envelope.
// `message` is shown to the user as-is, so keep it plain and free of internal detail.
export class AppError extends Error {
  readonly statusCode: number;
  readonly errors: ErrorMessages;

  constructor(message: string, statusCode: number, { errors = {}, cause }: AppErrorOptions = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'The request is invalid.', options?: AppErrorOptions) {
    super(message, 400, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in to continue.', options?: AppErrorOptions) {
    super(message, 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.', options?: AppErrorOptions) {
    super(message, 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', options?: AppErrorOptions) {
    super(message, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This conflicts with existing data.', options?: AppErrorOptions) {
    super(message, 409, options);
  }
}

export class ValidationError extends AppError {
  constructor(errors: ErrorMessages, message = 'Some details need fixing.') {
    super(message, 422, { errors });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many attempts. Please wait and try again.') {
    super(message, 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'The service is temporarily unavailable. Please try again.') {
    super(message, 503);
  }
}

export class NotImplementedError extends AppError {
  constructor(message = 'This feature is not available yet.') {
    super(message, 501);
  }
}
