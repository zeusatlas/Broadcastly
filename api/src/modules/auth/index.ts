// Public API of the auth module — one sign-in for every account, sessions and access control
// (FR-AUTH, FR-IAM). Other modules import from here only.
export { authRouter } from './auth_routes';
export { OrganisationExecutive } from './entities/organisation_executive_entity';
export { PlatformAdmin } from './entities/platform_admin_entity';
export { actAsHead, loadProfileAccess } from './access_resolver';
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
  updatePlatformAdminPermissionsSchema,
  userResponseSchema,
} from './auth_schemas';
export { platformPermissionsOf } from './platform_permissions';
export {
  EXECUTIVE_STATUSES,
  PERMISSIONS,
  PLATFORM_ADMIN_STATUSES,
  PLATFORM_PERMISSIONS,
  USER_ROLES,
  type AccessContext,
  type AccessPermission,
  type ActionActor,
  type CreateExecutiveRequest,
  type CreatePlatformAdminRequest,
  type ExecutiveStatus,
  type ManageableStatus,
  type Permission,
  type PlatformAdminResponse,
  type PlatformAdminStatus,
  type PlatformPermission,
  type UpdatePlatformAdminPermissionsRequest,
  type UserResponse,
  type UserRole,
} from './auth_types';
