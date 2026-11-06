import { PLATFORM_PERMISSIONS, type PlatformPermission } from './auth_types';

const isPlatformPermission = (value: string): value is PlatformPermission =>
  (PLATFORM_PERMISSIONS as readonly string[]).includes(value);

// A platform admin's effective permissions. Unknown stored strings are dropped, never trusted.
export function platformPermissionsOf(admin: {
  isSuperAdmin: boolean;
  permissions: readonly string[];
}): PlatformPermission[] {
  if (admin.isSuperAdmin) return [...PLATFORM_PERMISSIONS];
  return [...new Set(admin.permissions.filter(isPlatformPermission))].sort();
}
