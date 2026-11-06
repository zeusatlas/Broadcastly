import { useMemo } from 'react';

import type { AccessPermission, UserRole } from '@/types/models';

import { useAuthStore } from '../store/auth_store';
import { checkAccess, type AccessRule } from '../utils/access_policy';

// Everything here decides what is shown, nothing more. Per FR-IAM-05 the backend
// re-checks every protected operation. Permissions arrive with the user from the
// server, so a grant or revoke (FR-IAM-04) shows on next sign-in or app launch.

// The general form. Re-renders only when the boolean result changes.
//   useCan({ permission: 'broadcast.send' })
//   useCan({ anyOf: ['broadcast.send', 'broadcast.submit'] })
//   useCan({ allOf: ['member.manage', 'member.import'], roles: ['head'] })
export const useCan = (rule: AccessRule) => useAuthStore((state) => checkAccess(state.user, rule));

export const useHasPermission = (permission: AccessPermission) => useCan({ permission });

export const useHasAnyPermission = (...permissions: AccessPermission[]) =>
  useCan({ anyOf: permissions });

export const useHasAllPermissions = (...permissions: AccessPermission[]) =>
  useCan({ allOf: permissions });

export const useHasRole = (...roles: UserRole[]) => useCan({ roles });

// For checking many rules in one component (menus, route guards, lists of actions).
//   const access = useAccess();
//   access.can('report.view') · access.canAny([...]) · access.check(rule)
export function useAccess() {
  const user = useAuthStore((state) => state.user);

  return useMemo(
    () => ({
      can: (permission: AccessPermission) => checkAccess(user, { permission }),
      canAny: (permissions: readonly AccessPermission[]) =>
        checkAccess(user, { anyOf: permissions }),
      canAll: (permissions: readonly AccessPermission[]) =>
        checkAccess(user, { allOf: permissions }),
      hasRole: (...roles: UserRole[]) => checkAccess(user, { roles }),
      check: (rule: AccessRule) => checkAccess(user, rule),
    }),
    [user],
  );
}
