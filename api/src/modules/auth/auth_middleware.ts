import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ForbiddenError, UnauthorizedError } from '../../common/errors/app_error';

import { actAsHead, resolveAccess } from './access_resolver';
import type { AccessContext, AccessPermission, UserRole } from './auth_types';
import { verifyAccessToken } from './token_service';

export const ACTING_HEADER = 'x-organisation-id';
const OWN_ACCOUNT_ROUTES = /\/(auth|platform)$/;

// Step 1 of every protected route: who is calling. Sets req.auth or rejects with 401.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
  if (!token) throw new UnauthorizedError();

  const claims = verifyAccessToken(token);
  req.auth = await resolveAccess(claims.sub, claims.sid);

  // A platform admin sends X-Organisation-Id to work inside that organisation. Their own account
  // (/auth) and the admin tools (/platform) always stay their own; executives cannot use it.
  const organisationId = req.headers[ACTING_HEADER];
  if (
    typeof organisationId === 'string' &&
    req.auth.kind === 'platform_admin' &&
    !OWN_ACCOUNT_ROUTES.test(req.baseUrl)
  ) {
    req.auth = await actAsHead(req.auth, organisationId);
  }
  next();
}

export interface AccessRule {
  permission?: AccessPermission;
  anyOf?: readonly AccessPermission[];
  allOf?: readonly AccessPermission[];
  roles?: readonly UserRole[];
}

// Mirrors checkAccess() in the app, but this one is the real access control (FR-IAM-05).
export function hasAccess(auth: AccessContext, rule: AccessRule): boolean {
  const has = (permission: AccessPermission) => auth.permissions.has(permission);

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
