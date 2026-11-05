import { router, Tabs, useFocusEffect } from 'expo-router';
import {
  Bell,
  BriefcaseBusiness,
  FileSpreadsheet,
  MapPinned,
  Network,
  Send,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { RefreshControl, View } from 'react-native';

import { HeaderButton, ProfileButton } from '@/components/shared';
import { QueryState, ScrollScreen, StatTile, Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useCurrentUser, type AccessRule } from '@/features/auth';
import { useReadCreditBalancesQuery } from '@/features/credits';
import { useReadUnreadCountQuery } from '@/features/notifications';
import { useReadOrganisationOverviewQuery } from '@/features/organisation';

import { CreditBalanceCard, QuickActions, type QuickAction } from '../components';

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
    key: 'organisation',
    label: 'Organisation',
    hint: 'Units, positions and executives',
    icon: Network,
    href: '/organisation',
    route: 'organisation/index',
  },
];

const isRouteAllowed = (route: string, check: (rule: AccessRule) => boolean) => {
  const gate = GATED_ROUTES.find((r) => r.name === route);
  return gate ? check(gate.access) : true;
};

// Tiles show a dash until the counts arrive, so the layout never jumps.
const count = (value: number | null | undefined) =>
  value === undefined || value === null ? '—' : value.toLocaleString();

// Deliberately minimal (owner's rule): who you are, four counts, the actions you can take.
// Credits, approvals and broadcasts join once those API modules are mounted.
export function DashboardScreen() {
  const user = useCurrentUser();
  const access = useAccess();
  const canViewOverview = Boolean(user?.organisation);
  const overview = useReadOrganisationOverviewQuery({ enabled: canViewOverview });
  const balances = useReadCreditBalancesQuery();
  const unread = useReadUnreadCountQuery();
  const refetchUnread = useRef(unread.refetch);
  useEffect(() => {
    refetchUnread.current = unread.refetch;
  });
  // Coming back from the notifications screen should clear the badge for what was read there.
  useFocusEffect(useCallback(() => refetchUnread.current(), []));
  const totals = overview.data;
  const quickActions = QUICK_ACTIONS.filter((a) => isRouteAllowed(a.route, access.check));
  const role =
    user?.appointments.map((appointment) => appointment.positionTitle).join(' · ') || 'Executive';
  const isRefreshing = overview.isFetching || balances.isFetching;
  const refresh = () => {
    overview.refetch();
    balances.refetch();
  };

  return (
    <ScrollScreen
      className="gap-7 pt-4"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
    >
      <Tabs.Screen
        options={{
          headerLeft: () => (
            <ProfileButton
              name={user?.fullName ?? ''}
              organisationName={user?.organisation?.name}
              organisationLogoUrl={user?.organisation?.logoUrl}
            />
          ),
          headerRight: () => (
            <HeaderButton
              icon={Bell}
              label="Notifications"
              badgeCount={unread.data?.unread ?? 0}
              onPress={() => router.push('/notifications')}
            />
          ),
        }}
      />
      <CreditBalanceCard
        organisationName={user?.organisation?.name ?? 'Your organisation'}
        role={role}
        balance={balances.data?.mine.available}
        isLoading={balances.isLoading}
        onPress={() => router.push('/credits')}
      />
      <QueryState
        isLoading={balances.isLoading}
        error={balances.error}
        isEmpty={false}
        emptyText=""
        onRetry={balances.refetch}
      />

      {canViewOverview ? (
        <View className="gap-3">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-foreground">
            Organisation overview
          </Text>
          <View className="flex-row gap-3">
            <StatTile
              label="Members"
              value={count(totals?.members)}
              caption={totals?.members === null ? 'Organisation-wide only' : 'In your organisation'}
              icon={Users}
            />
            <StatTile
              label="Executives"
              value={count(totals?.activeExecutives)}
              caption={`${count(totals?.suspendedExecutives)} suspended`}
              icon={UsersRound}
            />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Units"
              value={count(totals?.units)}
              caption="In your reach"
              icon={MapPinned}
            />
            <StatTile
              label="Positions"
              value={count(totals?.positions)}
              caption="In your reachable structure"
              icon={BriefcaseBusiness}
            />
          </View>
          <QueryState
            isLoading={overview.isLoading}
            error={overview.error}
            isEmpty={false}
            emptyText=""
            onRetry={overview.refetch}
          />
        </View>
      ) : null}

      {quickActions.length > 0 ? (
        <View className="gap-3">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-foreground">
            Quick actions
          </Text>
          <QuickActions actions={quickActions} />
        </View>
      ) : null}
    </ScrollScreen>
  );
}
