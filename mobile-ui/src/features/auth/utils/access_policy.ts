import type { Permission, User, UserRole } from '@/types/models';

// One declarative requirement. Every field present must pass; omit what you do not need.
// Prefer permissions over roles: per BR-01 access is never decided by title alone.
export interface AccessRule {
  permission?: Permission;
  anyOf?: readonly Permission[];
  allOf?: readonly Permission[];
  roles?: readonly UserRole[];
}

// Pure and synchronous so it works in hooks, route guards and plain functions alike.
// Decides what is shown only; the backend re-checks every protected operation (FR-IAM-05).
export function checkAccess(user: User | null, rule: AccessRule): boolean {
  if (!user) return false;

  const has = (permission: Permission) => user.permissions.includes(permission);

  if (rule.permission && !has(rule.permission)) return false;
  if (rule.allOf && !rule.allOf.every(has)) return false;
  if (rule.anyOf && !rule.anyOf.some(has)) return false;
  if (rule.roles && !rule.roles.includes(user.role)) return false;

  return true;
}
