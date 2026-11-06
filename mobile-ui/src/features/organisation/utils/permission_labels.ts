import {
  ChartNoAxesColumn,
  Send,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { Permission } from '@/types/models';

// What each permission means in plain words; the codes ("broadcast.draft") never reach the screen.
export const PERMISSION_INFO: Record<Permission, { label: string; description: string }> = {
  'appointment.manage': {
    label: 'Manage appointments',
    description: 'Appoint executives, and suspend or reactivate them.',
  },
  'member.manage': { label: 'Manage members', description: 'Add, edit and deactivate members.' },
  'member.import': {
    label: 'Import members',
    description: 'Upload member lists from a spreadsheet.',
  },
  'broadcast.draft': { label: 'Draft broadcasts', description: 'Write messages and save them.' },
  'broadcast.submit': {
    label: 'Submit broadcasts',
    description: 'Send drafts to someone who approves them.',
  },
  'broadcast.send': {
    label: 'Send broadcasts',
    description: 'Send messages to members without waiting for approval.',
  },
  'broadcast.select_recipients': {
    label: 'Select recipients',
    description: 'Choose which members or units receive a message.',
  },
  'broadcast.approve': {
    label: 'Approve broadcasts',
    description: 'Approve or reject messages before they go out.',
  },
  'report.view': {
    label: 'View reports',
    description: 'See whether messages reached members.',
  },
  'credit.allocate': {
    label: 'Allocate credits',
    description: 'Give SMS credits to other executives.',
  },
  'credit.purchase': { label: 'Purchase credits', description: 'Buy more SMS credits.' },
};

export const permissionLabel = (permission: string) =>
  PERMISSION_INFO[permission as Permission]?.label ?? permission.replace(/[._]/g, ' ');

// How the executive's page groups what someone can do, in the order a person reads it.
export const PERMISSION_GROUPS: { title: string; icon: LucideIcon; permissions: Permission[] }[] = [
  {
    title: 'Broadcasts',
    icon: Send,
    permissions: [
      'broadcast.draft',
      'broadcast.select_recipients',
      'broadcast.submit',
      'broadcast.send',
      'broadcast.approve',
    ],
  },
  { title: 'Members', icon: Users, permissions: ['member.manage', 'member.import'] },
  { title: 'Team', icon: UserCog, permissions: ['appointment.manage'] },
  { title: 'Credits', icon: Wallet, permissions: ['credit.purchase', 'credit.allocate'] },
  { title: 'Reports', icon: ChartNoAxesColumn, permissions: ['report.view'] },
];
