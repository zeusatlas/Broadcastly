import { AxiosError } from 'axios';

import type { ApiResponse, ErrorMessages, ErrorResponse } from '@/types/api';

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unknown';

export type FieldErrors = Record<string, string[]>;

const FALLBACK_MESSAGE: Record<ApiErrorKind, string> = {
  validation: 'Some details need fixing. Check the form and try again.',
  unauthorized: 'Your session has ended. Please sign in again.',
  forbidden: 'You do not have permission to do that.',
  not_found: 'We could not find what you were looking for.',
  conflict: 'This was changed by someone else. Refresh and try again.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  server: 'Something went wrong on our end. Please try again.',
  network: 'No connection. Check your network and try again.',
  timeout: 'The request took too long. Please try again.',
  cancelled: 'That request was cancelled.',
  unknown: 'Something went wrong. Please try again.',
};

// Read defensively: a proxy or gateway can answer with a body that is not ours.
type ErrorBody = Partial<ErrorResponse> & Partial<Pick<ApiResponse, 'message'>>;

interface ApiErrorOptions {
  kind: ApiErrorKind;
  status?: number;
  response?: ErrorResponse;
  fieldErrors?: FieldErrors;
  cause?: unknown;
}

// The backend sends `string | string[]` per field; forms always get an array.
function toFieldErrors(errors: ErrorMessages | undefined): FieldErrors | undefined {
  if (!errors || typeof errors !== 'object') return undefined;

  return Object.fromEntries(
    Object.entries(errors).map(([field, value]) => [field, Array.isArray(value) ? value : [value]]),
  );
}

// Only a body that follows our contract becomes `response`; gateway HTML or plain text does not.
function toErrorResponse(body: ErrorBody | undefined): ErrorResponse | undefined {
  if (!body || typeof body !== 'object' || typeof body.status !== 'string') return undefined;

  return { status: body.status, errors: body.errors ?? {} };
}

function firstErrorMessage(fieldErrors: FieldErrors | undefined): string | undefined {
  return fieldErrors ? Object.values(fieldErrors)[0]?.[0] : undefined;
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';

  return 'unknown';
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly response?: ErrorResponse;
  readonly fieldErrors?: FieldErrors;
  readonly cause?: unknown;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
    this.response = options.response;
    this.fieldErrors = options.fieldErrors;
    this.cause = options.cause;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (error instanceof AxiosError) {
      if (error.code === AxiosError.ERR_CANCELED) {
        return new ApiError(FALLBACK_MESSAGE.cancelled, { kind: 'cancelled', cause: error });
      }

      if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
        return new ApiError(FALLBACK_MESSAGE.timeout, { kind: 'timeout', cause: error });
      }

      if (error.response) {
        const body = error.response.data as ErrorBody | undefined;
        const { status } = error.response;
        const kind = kindFromStatus(status);
        const fieldErrors = toFieldErrors(body?.errors);
        // 5xx bodies can carry stack traces or SQL; never show them to the user.
        const serverMessage =
          kind === 'server' ? undefined : (body?.message ?? firstErrorMessage(fieldErrors));

        return new ApiError(serverMessage ?? FALLBACK_MESSAGE[kind], {
          kind,
          status,
          response: toErrorResponse(body),
          fieldErrors,
          cause: error,
        });
      }

      if (error.request) {
        return new ApiError(FALLBACK_MESSAGE.network, { kind: 'network', cause: error });
      }
    }

    return new ApiError(FALLBACK_MESSAGE.unknown, { kind: 'unknown', cause: error });
  }

  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'rate_limited' ||
      this.kind === 'server'
    );
  }

  fieldError(field: string): string | undefined {
    return this.fieldErrors?.[field]?.[0];
  }
}
