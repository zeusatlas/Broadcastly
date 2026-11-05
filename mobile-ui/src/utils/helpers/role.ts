import type { UserRole } from '@/types/models';

const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Administrator',
  chairman: 'Head',
  executive: 'Executive',
};

export const formatRole = (role: UserRole) => ROLE_LABELS[role];
