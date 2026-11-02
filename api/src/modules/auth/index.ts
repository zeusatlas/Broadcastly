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
  EXECUTIVE_STATUSES,
  PERMISSIONS,
  USER_ROLES,
  type AccessContext,
  type ActionActor,
  type CreateExecutiveRequest,
  type ExecutiveStatus,
  type ManageableExecutiveStatus,
  type Permission,
  type UserRole,
} from './auth_types';
