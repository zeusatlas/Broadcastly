// Public API of the auth module — one sign-in for every account, sessions and access control
// (FR-AUTH, FR-IAM). Other modules import from here only.
export { authRouter } from './auth_routes';
export { actorFrom, auditActor, authService } from './auth_service';
export {
  authenticate,
  authorize,
  hasAccess,
  requireAuth,
  type AccessRule,
} from './auth_middleware';
export {
  createExecutiveSchema,
  createPlatformAdminSchema,
  platformAdminResponseSchema,
} from './auth_schemas';
export {
  EXECUTIVE_STATUSES,
  PERMISSIONS,
  PLATFORM_ADMIN_STATUSES,
  USER_ROLES,
  type AccessContext,
  type ActionActor,
  type CreateExecutiveRequest,
  type CreatePlatformAdminRequest,
  type ExecutiveStatus,
  type ManageableStatus,
  type Permission,
  type PlatformAdminResponse,
  type PlatformAdminStatus,
  type UserRole,
} from './auth_types';
