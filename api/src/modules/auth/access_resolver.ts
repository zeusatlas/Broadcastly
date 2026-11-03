import { UnauthorizedError } from '../../common/errors/app_error';
import {
  organisationService,
  type ActiveAccess,
  type AppointmentSummaryResponse,
} from '../organisation';

import { authRepository } from './auth_repository';
import { PERMISSIONS, type AccessContext, type Permission, type UserRole } from './auth_types';

const SESSION_ENDED = 'Your session has ended. Please sign in again.';

export interface ProfileAccess {
  role: UserRole;
  permissions: Permission[];
  appointments: AppointmentSummaryResponse[];
}

const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

// An active chairman appointment brings every permission; everyone else gets what was granted on
// their active appointments (BR-01). Ending the appointment removes the access at once.
function effectivePermissions(access: ActiveAccess): Permission[] {
  if (access.holdsChairman) return [...PERMISSIONS];
  return [...new Set(access.grantedPermissions.filter(isPermission))].sort();
}

const roleOf = (access: ActiveAccess): UserRole =>
  access.holdsChairman ? 'chairman' : 'executive';

export async function loadProfileAccess(memberId: string): Promise<ProfileAccess> {
  const access = await organisationService.getActiveAccess(memberId, { appointments: true });
  return {
    role: roleOf(access),
    permissions: effectivePermissions(access),
    appointments: access.appointments,
  };
}

// Runs on every authenticated request (BR-05, FR-AUTH-04): a revoked session, a suspended account
// or an ended appointment takes effect on the very next request. At most two queries.
export async function resolveAccess(accountId: string, sessionId: string): Promise<AccessContext> {
  const session = await authRepository.findSessionForAccess(sessionId);
  const ownerId = session?.executiveId ?? session?.platformAdminId;
  if (!session || ownerId !== accountId || session.status !== 'active') {
    throw new UnauthorizedError(SESSION_ENDED);
  }

  if (!session.executiveId || !session.memberId) {
    return {
      kind: 'platform_admin',
      accountId,
      sessionId,
      role: 'platform_admin',
      memberId: null,
      organisationId: null,
      organisationWide: false,
      permissions: new Set(),
      scopeUnitIds: [],
    };
  }

  const access = await organisationService.getActiveAccess(session.memberId, { scope: true });
  return {
    kind: 'executive',
    accountId,
    sessionId,
    role: roleOf(access),
    memberId: session.memberId,
    organisationId: session.organisationId,
    organisationWide: access.organisationWide,
    permissions: new Set(effectivePermissions(access)),
    scopeUnitIds: access.scopeUnitIds,
  };
}
