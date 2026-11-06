import type { Href } from 'expo-router';
import {
  Building,
  Building2,
  CircleX,
  Coins,
  CreditCard,
  ShieldAlert,
  UserCog,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react-native';

import { useHasPermission } from '@/features/auth';
import { NotificationFeed, type NotificationTone } from '@/features/notifications';

import {
  useMarkAllPlatformNotificationsReadMutation,
  useMarkPlatformNotificationReadMutation,
  usePlatformNotificationPages,
} from '../hooks/use_platform_api';
import type { PlatformNotificationResponse, PlatformNotificationType } from '../types';

const STYLE: Record<PlatformNotificationType, { icon: LucideIcon; tone: NotificationTone }> = {
  purchase: { icon: CreditCard, tone: 'success' },
  purchase_failed: { icon: CircleX, tone: 'destructive' },
  credits: { icon: Coins, tone: 'primary' },
  organisation: { icon: Building2, tone: 'primary' },
  organisation_suspended: { icon: Building, tone: 'warning' },
  head: { icon: UserRoundCheck, tone: 'accent' },
  admin: { icon: UserCog, tone: 'primary' },
  security: { icon: ShieldAlert, tone: 'destructive' },
};

// The same screen as the organisation's notifications, fed by the platform admin's own events.
export function AdminNotificationsScreen() {
  const canViewAudit = useHasPermission('platform.audit.view');
  const canViewFinance = useHasPermission('platform.finance.view');
  const markRead = useMarkPlatformNotificationReadMutation();
  const markAll = useMarkAllPlatformNotificationsReadMutation();

  const destinationOf = (item: PlatformNotificationResponse): Href | null => {
    if (item.type === 'security') return canViewAudit ? '/admin/audit' : null;
    if (item.type === 'admin') return '/admin/admins';
    if ((item.type === 'purchase' || item.type === 'purchase_failed') && canViewFinance) {
      return '/admin/payments';
    }
    if (item.organisationId) {
      return { pathname: '/admin/organisations/[id]', params: { id: item.organisationId } };
    }
    return null;
  };

  return (
    <NotificationFeed
      usePagesFor={usePlatformNotificationPages}
      markRead={async (item) => Boolean(await markRead.mutate({ notificationId: item.id }))}
      markAllRead={async () => Boolean(await markAll.mutate(undefined))}
      destinationOf={destinationOf}
      styleOf={(item) => STYLE[item.type]}
      emptyDescription="Payments, new organisations and heads, and account alerts will appear here."
      searchPlaceholder="Search by organisation or person"
    />
  );
}
