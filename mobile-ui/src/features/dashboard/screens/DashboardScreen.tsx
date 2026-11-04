import { router, Tabs } from 'expo-router';
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
import { View } from 'react-native';

import { HeaderButton, ProfileButton } from '@/components/shared';
import { QueryState, ScrollScreen, StatTile, Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useCurrentUser, type AccessRule } from '@/features/auth';
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
  const canManage = isRouteAllowed('organisation/index', access.check);
  const overview = useReadOrganisationOverviewQuery({ enabled: canManage });
  const totals = overview.data;
  const quickActions = QUICK_ACTIONS.filter((a) => isRouteAllowed(a.route, access.check));
  const role = user?.appointments[0]?.positionTitle ?? 'Executive';

  return (
    <ScrollScreen className="gap-7 pt-4">
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
              onPress={() => router.push('/notifications')}
            />
          ),
        }}
      />
      <CreditBalanceCard
        organisationName={user?.organisation?.name ?? 'Your organisation'}
        role={role}
        onPress={() => router.push('/credits')}
      />

      {canManage ? (
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
              caption="Offices you created"
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
