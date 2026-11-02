import { UnauthorizedError } from '../../common/errors/app_error';
import {
  organisationService,
  type ActiveAccess,
  type AppointmentSummaryResponse,
} from '../organisation';

import { authRepository } from './auth_repository';
import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  type AccessContext,
  type Permission,
  type UserRole,
} from './auth_types';

const SESSION_ENDED = 'Your session has ended. Please sign in again.';

export interface ProfileAccess {
  permissions: Permission[];
  appointments: AppointmentSummaryResponse[];
}

const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

// Role defaults only apply while the member holds an active appointment (BR-01), so ending
// someone's last appointment removes their access even though their role is unchanged.
function effectivePermissions(access: ActiveAccess, role: UserRole): Permission[] {
  const fromRole = access.hasActiveAppointment ? ROLE_DEFAULT_PERMISSIONS[role] : [];
  return [...new Set([...fromRole, ...access.grantedPermissions.filter(isPermission)])].sort();
}

// For responses that show the user (sign-in, /me): permissions and appointments, no scope.
export async function loadProfileAccess(memberId: string, role: UserRole): Promise<ProfileAccess> {
  const access = await organisationService.getActiveAccess(memberId, { appointments: true });
  return { permissions: effectivePermissions(access, role), appointments: access.appointments };
}

// Runs on every authenticated request (BR-05, FR-AUTH-04): a revoked session, a suspended
// executive or an ended appointment takes effect on the very next request. Two queries in all:
// the session row with its executive's state, then permissions and scope in one statement.
export async function resolveAccess(
  executiveId: string,
  sessionId: string,
): Promise<AccessContext> {
  const session = await authRepository.findSessionForAccess(sessionId);

  if (!session || session.executiveId !== executiveId || session.status !== 'active') {
    throw new UnauthorizedError(SESSION_ENDED);
  }

  const access = await organisationService.getActiveAccess(session.memberId, { scope: true });

  return {
    executiveId,
    memberId: session.memberId,
    sessionId,
    role: session.role,
    permissions: new Set(effectivePermissions(access, session.role)),
    scopeUnitIds: access.scopeUnitIds,
  };
}
