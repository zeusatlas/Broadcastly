import { Bell, CheckCheck, FileSpreadsheet, Send, ShieldCheck, Wallet } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { HEADER_BUTTON_SIZE, HeaderButton } from '@/components/shared';
import { Avatar, Badge, Card, ScrollScreen, Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useCurrentUser, type AccessRule } from '@/features/auth';
import type { BroadcastSummary } from '@/features/broadcasts';
import { useTheme } from '@/hooks/use_theme';

import { CreditBalanceCard, QuickActions, RecentBroadcasts, type QuickAction } from '../components';

// Each action opens a gated route, so it is shown only when GATED_ROUTES would let the user in.
const QUICK_ACTIONS: (QuickAction & { route: string })[] = [
  {
    key: 'broadcast',
    label: 'New broadcast',
    hint: 'Compose an SMS',
    icon: Send,
    href: '/broadcasts/new',
    route: 'broadcasts/new',
  },
  {
    key: 'import',
    label: 'Import members',
    hint: 'Upload a spreadsheet',
    icon: FileSpreadsheet,
    href: '/members/import',
    route: 'members/import',
  },
  {
    key: 'allocate',
    label: 'Allocate credits',
    hint: 'Share SMS credits',
    icon: Wallet,
    href: '/credits/allocate',
    route: 'credits/allocate',
  },
  {
    key: 'approvals',
    label: 'Approvals',
    hint: 'Review pending sends',
    icon: CheckCheck,
    href: '/approvals',
    route: 'approvals/index',
  },
];

const isRouteAllowed = (route: string, check: (rule: AccessRule) => boolean) => {
  const gate = GATED_ROUTES.find((r) => r.name === route);
  return gate ? check(gate.access) : true;
};

// TODO(backend contract): static placeholder data below; replace with api/dashboard_api.ts.
const RECENT_BROADCASTS: BroadcastSummary[] = [
  {
    id: '1',
    title: 'Executive meeting — Saturday 9am',
    audience: 'Constituency executives',
    sentAt: 'Today, 08:14',
    status: 'completed',
    delivered: 142,
    recipients: 146,
  },
  {
    id: '2',
    title: 'Polling station verification notice',
    audience: '4 branches',
    sentAt: 'Yesterday',
    status: 'partially_failed',
    delivered: 1890,
    recipients: 2014,
  },
  {
    id: '3',
    title: 'Membership dues reminder',
    audience: 'All members',
    sentAt: '2 days ago',
    status: 'pending_approval',
    delivered: 0,
    recipients: 8412,
  },
];

const SCOPE_STATS = [
  { key: 'members', label: 'Members', value: '8,412' },
  { key: 'executives', label: 'Executives', value: '146' },
  { key: 'stations', label: 'Stations', value: '62' },
];

export function DashboardScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const appointment = user?.appointments[0];
  const unitName = appointment?.unitName ?? 'No active appointment';
  const access = useAccess();
  const quickActions = QUICK_ACTIONS.filter((a) => isRouteAllowed(a.route, access.check));
  const canApprove = isRouteAllowed('approvals/index', access.check);

  return (
    <ScrollScreen className="gap-6 pt-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => router.push('/profile')}
          hitSlop={6}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
          <Avatar
            name={user?.fullName ?? ''}
            size="sm"
            style={{ width: HEADER_BUTTON_SIZE, height: HEADER_BUTTON_SIZE }}
          />
        </Pressable>
        <View className="flex-1" />
        <HeaderButton
          icon={Bell}
          label="Notifications"
          isPlain
          iconSize={20}
          onPress={() => router.push('/notifications')}
        />
      </View>

      {appointment ? (
        <Badge
          label={`${unitName} · ${appointment.positionTitle}`}
          tone="accent"
          variant="subtle"
        />
      ) : null}

      <CreditBalanceCard balance={24850} estimatedMessages={24850} />

      {canApprove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="1 broadcast awaiting your approval. Review"
          onPress={() => router.push('/approvals')}
          className="active:opacity-80"
        >
          <Card
            variant="flat"
            className="flex-row items-center gap-3 border-critical/40 bg-critical/10"
          >
            <View className="flex-1 gap-1">
              <Text className="font-sans-semibold text-sm text-foreground">
                1 broadcast awaiting your approval
              </Text>
              <Text variant="caption">Membership dues reminder · 8,412 recipients</Text>
            </View>
            <Text className="font-sans-semibold text-sm text-critical">Review</Text>
          </Card>
        </Pressable>
      ) : null}

      {quickActions.length > 0 ? (
        <View className="gap-3">
          <Text variant="heading">Quick actions</Text>
          <QuickActions actions={quickActions} />
        </View>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">Your scope</Text>
        <View className="flex-row gap-3">
          {SCOPE_STATS.map(({ key, label, value }) => (
            <Card key={key} className="flex-1 gap-1 p-3">
              <Text className="font-sans-bold text-xl text-foreground">{value}</Text>
              <Text variant="caption" numberOfLines={1}>
                {label}
              </Text>
            </Card>
          ))}
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">Recent broadcasts</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all broadcasts"
            onPress={() => router.push('/broadcasts')}
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="font-sans-medium text-sm text-accent-emphasis">See all</Text>
          </Pressable>
        </View>
        <RecentBroadcasts
          broadcasts={RECENT_BROADCASTS}
          onSelect={(id) => router.push({ pathname: '/broadcasts/[id]', params: { id } })}
        />
      </View>

      <View className="flex-row items-center gap-2 pb-2">
        <ShieldCheck size={14} color={theme.mutedForeground} />
        <Text variant="caption">Scope limited to {unitName}</Text>
      </View>
    </ScrollScreen>
  );
}
