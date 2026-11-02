import type { PropsWithChildren, ReactNode } from 'react';

import { useCan } from '../hooks/use_permissions';
import type { AccessRule } from '../utils/access_policy';

type PermissionGateProps = PropsWithChildren<AccessRule & { fallback?: ReactNode }>;

// <PermissionGate permission="broadcast.send"> · <PermissionGate anyOf={[…]} fallback={…}>
// Hides a control the user cannot use. Display only — never a substitute for backend checks.
export function PermissionGate({ fallback = null, children, ...rule }: PermissionGateProps) {
  return useCan(rule) ? children : fallback;
}
