import {
  Building2,
  Megaphone,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { PlatformPermission } from '@/types/models';

// Order shown in the permission checklist when adding or editing an admin.
export const PLATFORM_PERMISSION_OPTIONS: {
  key: PlatformPermission;
  label: string;
  description: string;
}[] = [
  {
    key: 'platform.organisation.manage',
    label: 'Manage organisations',
    description: 'Create, suspend and reactivate organisations, appoint heads, change logos.',
  },
  {
    key: 'platform.organisation.operate',
    label: 'Work inside organisations',
    description:
      'Open an organisation and do everything its head can: members, broadcasts, credits.',
  },
  {
    key: 'platform.executive.manage',
    label: 'Manage executives',
    description: 'Suspend and reactivate executives in any organisation.',
  },
  {
    key: 'platform.credit.manage',
    label: 'Adjust credits',
    description: 'Add or remove credits on an organisation wallet.',
  },
  {
    key: 'platform.finance.view',
    label: 'View payments',
    description: 'Credit purchases, payment totals and credit history.',
  },
  {
    key: 'platform.broadcast.view',
    label: 'View broadcasts',
    description: 'Broadcast lists across organisations.',
  },
  { key: 'platform.audit.view', label: 'View audit log', description: 'Every recorded action.' },
  {
    key: 'platform.settings.manage',
    label: 'Change settings',
    description: 'Import limits and platform notifications.',
  },
  {
    key: 'platform.admin.manage',
    label: 'Manage admins',
    description: 'Add admins, change their permissions, suspend them.',
  },
];

// How the checklist groups them, like an executive's permissions on the organisation side.
export const PLATFORM_PERMISSION_GROUPS: {
  title: string;
  icon: LucideIcon;
  permissions: PlatformPermission[];
}[] = [
  {
    title: 'Organisations',
    icon: Building2,
    permissions: [
      'platform.organisation.manage',
      'platform.organisation.operate',
      'platform.executive.manage',
    ],
  },
  {
    title: 'Money',
    icon: Wallet,
    permissions: ['platform.finance.view', 'platform.credit.manage'],
  },
  {
    title: 'Activity',
    icon: Megaphone,
    permissions: ['platform.broadcast.view', 'platform.audit.view'],
  },
  {
    title: 'Platform',
    icon: SlidersHorizontal,
    permissions: ['platform.settings.manage', 'platform.admin.manage'],
  },
];
