import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ForbiddenError, UnauthorizedError } from '../../common/errors/app_error';

import { resolveAccess } from './access_resolver';
import type { AccessContext, Permission, UserRole } from './auth_types';
import { verifyAccessToken } from './token_service';

// Step 1 of every protected route: who is calling. Sets req.auth or rejects with 401.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
  if (!token) throw new UnauthorizedError();

  const claims = verifyAccessToken(token);
  req.auth = await resolveAccess(claims.sub, claims.sid);
  next();
}

export interface AccessRule {
  permission?: Permission;
  anyOf?: readonly Permission[];
  allOf?: readonly Permission[];
  roles?: readonly UserRole[];
}

// Mirrors checkAccess() in the app, but this one is the real access control (FR-IAM-05).
export function hasAccess(auth: AccessContext, rule: AccessRule): boolean {
  const has = (permission: Permission) => auth.permissions.has(permission);

  if (rule.permission && !has(rule.permission)) return false;
  if (rule.allOf && !rule.allOf.every(has)) return false;
  if (rule.anyOf && !rule.anyOf.some(has)) return false;
  if (rule.roles && !rule.roles.includes(auth.role)) return false;

  return true;
}

// Step 2: what they may do. Always after authenticate.
//   router.post('/', authenticate, authorize({ permission: 'broadcast.send' }), …)
// Scope (which units) is enforced in the service query, not here (FR-IAM-03).
export function authorize(rule: AccessRule): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new UnauthorizedError();
    if (!hasAccess(req.auth, rule)) throw new ForbiddenError();

    next();
  };
}

export function requireAuth(req: Request): AccessContext {
  if (!req.auth) throw new UnauthorizedError();

  return req.auth;
}
