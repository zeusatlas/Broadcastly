import type { FilterOption } from '@/components/ui';

import type { PlatformCreditTransactionType, PlatformPeriod, PurchaseStatus } from '../types';

export const cedis = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const signed = (amount: number) =>
  `${amount > 0 ? '+' : '−'}${Math.abs(amount).toLocaleString()}`;

export const PERIOD_OPTIONS: FilterOption<PlatformPeriod>[] = [
  { key: 'all_time', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 days' },
  { key: 'last_30_days', label: 'Last 30 days' },
  { key: 'last_365_days', label: 'Last 12 months' },
];

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  pending: 'Waiting for payment',
  completed: 'Paid',
  failed: 'Failed',
};

export const CREDIT_TYPE_LABEL: Record<PlatformCreditTransactionType, string> = {
  purchase: 'Bought',
  allocation_in: 'Received',
  allocation_out: 'Given to an executive',
  reservation: 'Set aside',
  release: 'Released',
  consumption: 'Used for a broadcast',
  refund: 'Refunded',
  reversal: 'Reversed',
  adjustment: 'Adjusted by Broadcastly',
};

// What happened, in plain words. Unknown actions still read sensibly ("member.created" → "Member created").
const AUDIT_LABEL: Record<string, string> = {
  'auth.sign_in': 'Signed in',
  'auth.sign_in_failed': 'Failed sign-in',
  'auth.account_locked': 'Account locked after failed sign-ins',
  'auth.otp_sent': 'Sign-in code sent',
  'auth.otp_failed': 'Wrong sign-in code',
  'auth.sign_out': 'Signed out',
  'auth.sign_out_all': 'Signed out of every device',
  'auth.refresh_token_reused': 'Session ended: possible stolen sign-in',
  'executive.created': 'Executive appointed',
  'executive.suspended': 'Executive suspended',
  'executive.reactivated': 'Executive reactivated',
  'organisation.created': 'Organisation created',
  'organisation.updated': 'Organisation renamed',
  'organisation.head_replaced': 'Head replaced',
  'organisation.constituency_created': 'Organisation created',
  'organisation.position_created': 'Position created',
  'organisation.position_updated': 'Position changed',
  'organisation.unit_created': 'Unit created',
  'organisation.appointment_created': 'Appointment made',
  'organisation.appointment_ended': 'Appointment ended',
  'organisation.suspended': 'Organisation suspended',
  'organisation.reactivated': 'Organisation reactivated',
  'organisation.logo_updated': 'Logo changed',
  'organisation.logo_removed': 'Logo removed',
  'organisation.notification_preferences_updated': 'Notification settings changed',
  'platform_admin.created': 'Admin added',
  'platform_admin.suspended': 'Admin suspended',
  'platform_admin.reactivated': 'Admin reactivated',
  'platform_admin.permissions_changed': 'Admin permissions changed',
  'platform.settings_updated': 'Platform settings changed',
  'credit.purchase_started': 'Credit purchase started',
  'credit.purchase_completed': 'Credits bought',
  'credit.purchase_failed': 'Credit purchase failed',
  'credit.adjusted': 'Credits adjusted by Broadcastly',
  'credit.allocated': 'Credits given to an executive',
  'broadcast.draft_created': 'Broadcast drafted',
  'broadcast.draft_updated': 'Draft edited',
  'broadcast.submitted': 'Broadcast sent for approval',
  'broadcast.approved': 'Broadcast approved',
  'broadcast.rejected': 'Broadcast rejected',
  'broadcast.dispatched': 'Broadcast sent',
  'broadcast.cancelled': 'Broadcast cancelled',
  'report.exported': 'Delivery report exported',
  'member.created': 'Member added',
  'member.updated': 'Member edited',
  'member.deactivated': 'Member deactivated',
  'member.reactivated': 'Member reactivated',
  'member.import_started': 'Member import started',
  'member.import_confirmed': 'Member import saved',
  'member.import_cancelled': 'Member import cancelled',
  'template.created': 'Template created',
  'template.updated': 'Template edited',
  'template.archived': 'Template archived',
};

export function auditLabel(action: string) {
  const known = AUDIT_LABEL[action];
  if (known) return known;
  const words = action.replace(/[._]/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
