import { router } from 'expo-router';
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

import { HeaderButton, HomeHeader } from '@/components/shared';
import { QueryState, ScrollScreen, StatTile, Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useCurrentUser, type AccessRule } from '@/features/auth';
import { useReadOrganisationOverviewQuery } from '@/features/organisation';

import { QuickActions, type QuickAction } from '../components';

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
  const openOrganisation = () => router.push('/organisation');

  const appointment = user?.appointments[0];
  const scopeName =
    appointment?.unitName ?? appointment?.organisationName ?? user?.organisation?.name;

  return (
    <ScrollScreen className="gap-8 pt-2">
      <View className="gap-2">
        <HomeHeader
          avatarName={user?.fullName ?? ''}
          trailing={
            <HeaderButton
              icon={Bell}
              label="Notifications"
              isPlain
              iconSize={20}
              onPress={() => router.push('/notifications')}
            />
          }
        />
        {/* {appointment ? (
          <Text variant="bodyMuted" numberOfLines={1}>
            {appointment.positionTitle} · {scopeName}
          </Text>
        ) : null} */}
      </View>

      {canManage ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <StatTile
              label="Members"
              value={count(totals?.members)}
              caption={totals?.members === null ? 'Organisation-wide only' : 'In your organisation'}
              icon={Users}
              onPress={() => router.push('/members')}
            />
            <StatTile
              label="Executives"
              value={count(totals?.activeExecutives)}
              caption={`${count(totals?.suspendedExecutives)} suspended`}
              icon={UsersRound}
              onPress={openOrganisation}
            />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Units"
              value={count(totals?.units)}
              caption="In your reach"
              icon={MapPinned}
              onPress={openOrganisation}
            />
            <StatTile
              label="Positions"
              value={count(totals?.positions)}
              caption="Offices you created"
              icon={BriefcaseBusiness}
              onPress={openOrganisation}
            />
          </View>
          <QueryState
            isLoading={false}
            error={overview.error}
            isEmpty={false}
            emptyText=""
            onRetry={overview.refetch}
          />
        </View>
      ) : null}

      {quickActions.length > 0 ? <QuickActions actions={quickActions} /> : null}
    </ScrollScreen>
  );
}
