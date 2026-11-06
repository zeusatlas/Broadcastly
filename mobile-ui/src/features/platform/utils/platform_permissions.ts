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
