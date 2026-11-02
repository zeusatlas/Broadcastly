import type { Request } from 'express';

import { NotFoundError } from '../errors/app_error';

export function notFound(req: Request): never {
  throw new NotFoundError(`No route for ${req.method} ${req.path}.`);
}
