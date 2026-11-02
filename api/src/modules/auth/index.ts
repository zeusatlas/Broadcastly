// Public API of the auth module — sign-in, sessions and access control (FR-AUTH, FR-IAM).
// Other modules import from here only.
export { authRouter } from './auth_routes';
export { authService } from './auth_service';
export {
  authenticate,
  authorize,
  hasAccess,
  requireAuth,
  type AccessRule,
} from './auth_middleware';
export { createExecutiveSchema } from './auth_schemas';
export {
  PERMISSIONS,
  USER_ROLES,
  type AccessContext,
  type CreateExecutiveRequest,
  type Permission,
  type UserRole,
} from './auth_types';
