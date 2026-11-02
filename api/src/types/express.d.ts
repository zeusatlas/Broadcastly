import type { AccessContext } from '../modules/auth';

declare global {
  namespace Express {
    interface Request {
      // Set by authenticate(). Read it through requireAuth(req) in controllers.
      auth?: AccessContext;
    }
  }
}

export {};
