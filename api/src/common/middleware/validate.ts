import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z, ZodType } from 'zod';

import { ValidationError } from '../errors/app_error';
import type { ErrorMessages } from '../http/api_response';

type RequestPart = 'body' | 'query' | 'params';

type RequestSchemas = Partial<Record<RequestPart, ZodType>>;

// Turns Zod issues into the { field: [messages] } map the app shows beside each input.
export function toErrorMessages(error: z.ZodError): ErrorMessages {
  const messages: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_';
    (messages[field] ??= []).push(issue.message);
  }

  return messages;
}

// Validates and strips unknown fields before the controller runs. Results go to res.locals,
// because Express 5 makes req.query read-only. Read them with `validated()`.
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const part of Object.keys(schemas) as RequestPart[]) {
      const result = schemas[part]!.safeParse(req[part]);
      if (!result.success) throw new ValidationError(toErrorMessages(result.error));

      res.locals[part] = result.data;
    }

    next();
  };
}

export function validated<T>(res: Response, part: RequestPart): T {
  return res.locals[part] as T;
}
