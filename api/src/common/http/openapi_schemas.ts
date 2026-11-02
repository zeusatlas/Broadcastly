import { z, type ZodType } from 'zod';

import '../../config/openapi';

import type { ErrorMessages } from './api_response';

// Reusable OpenAPI building blocks so every module documents the same envelope (AGENTS.md §6, §11).
// These schemas only describe responses; they never validate anything at runtime.

const errorEnvelopeSchema = z
  .object({
    status: z.literal('error'),
    status_code: z.number().int(),
    message: z.string(),
    errors: z.record(z.string(), z.union([z.array(z.string()), z.string()])),
  })
  .openapi('ErrorResponse');

export function successEnvelope<T extends ZodType>(
  data: T,
  message = 'Request successful.',
  statusCode = 200,
) {
  return z.object({
    status: z.literal('success'),
    status_code: z.number().int().openapi({ example: statusCode }),
    message: z.string().openapi({ example: message }),
    data,
  });
}

// For endpoints that return no `data`.
export function messageEnvelope(message: string) {
  return z.object({
    status: z.literal('success'),
    status_code: z.number().int().openapi({ example: 200 }),
    message: z.string().openapi({ example: message }),
  });
}

export function jsonBody<T extends ZodType>(schema: T, example?: unknown) {
  return { content: { 'application/json': { schema, example } }, required: true };
}

export function jsonResponse<T extends ZodType>(description: string, schema: T) {
  return { description, content: { 'application/json': { schema } } };
}

interface ErrorDoc {
  description: string;
  message: string;
  errors?: ErrorMessages;
}

const ERROR_DOCS: Record<number, ErrorDoc> = {
  400: {
    description: 'The request is malformed, e.g. the body is not valid JSON.',
    message: 'The request body is not valid JSON.',
  },
  401: {
    description: 'Not signed in, or the session has ended. Refresh the token or sign in again.',
    message: 'Please sign in to continue.',
  },
  403: {
    description: 'Signed in, but not allowed to do this.',
    message: 'You do not have permission to do that.',
  },
  404: {
    description: 'Nothing exists at this path or id.',
    message: 'The requested resource was not found.',
  },
  409: {
    description: 'Conflicts with data that already exists.',
    message: 'This record already exists.',
  },
  422: {
    description: 'Some fields are invalid. `errors` lists the messages for each field.',
    message: 'Some details need fixing.',
    errors: { email: ['Enter a valid email address.'] },
  },
  429: {
    description: 'Too many requests. Wait, then try again.',
    message: 'Too many attempts. Please wait and try again.',
  },
  503: {
    description: 'The database or Redis is unreachable.',
    message: 'A required service is unavailable.',
  },
};

type ErrorSpec = number | [code: number, description: string, message?: string];

// errorResponses(401, [403, 'Account suspended.', 'This account is not active.'], 422)
// A tuple overrides the default description (and example message) for that endpoint.
export function errorResponses(...specs: ErrorSpec[]) {
  return Object.fromEntries(
    specs.map((spec) => {
      const [code, description, message] = Array.isArray(spec) ? spec : [spec];
      const doc = ERROR_DOCS[code] ?? { description: 'Error.', message: 'Something went wrong.' };
      const example = {
        status: 'error',
        status_code: code,
        message: message ?? doc.message,
        errors: doc.errors ?? {},
      };

      return [
        code,
        {
          description: description ?? doc.description,
          content: { 'application/json': { schema: errorEnvelopeSchema, example } },
        },
      ];
    }),
  );
}
