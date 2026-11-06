import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../common/errors/app_error';
import { dataSource } from '../../config/database';
import {
  CHAIRMAN_POSITION_ID,
  organisationService,
  type ActiveAccess,
  type AppointmentSummaryResponse,
} from '../organisation';

import { authRepository } from './auth_repository';
import { PERMISSIONS, type AccessContext, type Permission, type UserRole } from './auth_types';
import { platformPermissionsOf } from './platform_permissions';

const SESSION_ENDED = 'Your session has ended. Please sign in again.';

export interface ProfileAccess {
  role: UserRole;
  permissions: Permission[];
  appointments: AppointmentSummaryResponse[];
}

const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

// An active head appointment brings every permission; everyone else gets what was granted on
// their active appointments (BR-01). Ending the appointment removes the access at once.
function effectivePermissions(access: ActiveAccess): Permission[] {
  if (access.holdsChairman) return [...PERMISSIONS];
  return [...new Set(access.grantedPermissions.filter(isPermission))].sort();
}

const roleOf = (access: ActiveAccess): UserRole => (access.holdsChairman ? 'head' : 'executive');

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
      permissions: new Set(
        platformPermissionsOf({
          isSuperAdmin: session.isSuperAdmin ?? false,
          permissions: session.adminPermissions ?? [],
        }),
      ),
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A platform admin working inside an organisation (owner's decision, 2026-11-06: admins have full
// control). The request runs as that organisation's head, so every head rule and scope still applies.
export async function actAsHead(
  admin: AccessContext,
  organisationId: string,
): Promise<AccessContext> {
  if (admin.kind !== 'platform_admin') throw new ForbiddenError();
  if (!admin.permissions.has('platform.organisation.operate')) {
    throw new ForbiddenError('You cannot work inside organisations.');
  }
  if (!UUID.test(organisationId)) throw new NotFoundError('Organisation not found.');

  const [row] = (await dataSource.query(
    `SELECT o.status, e.id AS "executiveId", e.member_id AS "memberId"
       FROM organisations o
       LEFT JOIN appointments a ON a.organisation_id = o.id AND a.position_id = $2
                               AND a.status = 'active'
       LEFT JOIN organisation_executives e ON e.member_id = a.member_id
                                          AND e.organisation_id = o.id
      WHERE o.id = $1
      LIMIT 1`,
    [organisationId, CHAIRMAN_POSITION_ID],
  )) as { status: string; executiveId: string | null; memberId: string | null }[];

  if (!row) throw new NotFoundError('Organisation not found.');
  if (row.status !== 'active') {
    throw new ConflictError('This organisation is suspended. Reactivate it first.');
  }
  if (!row.executiveId || !row.memberId) {
    throw new ConflictError('Appoint a head first: the organisation works through its head.');
  }

  return {
    kind: 'executive',
    accountId: row.executiveId,
    sessionId: admin.sessionId,
    role: 'head',
    memberId: row.memberId,
    organisationId,
    organisationWide: true,
    permissions: new Set(PERMISSIONS),
    scopeUnitIds: [],
    actingPlatformAdminId: admin.accountId,
  };
}
