import { router, useFocusEffect } from 'expo-router';
import { Bell, Building2, ShieldAlert, UserRoundPlus, UsersRound } from 'lucide-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { HeaderButton, HomeHeader, ProfileButton } from '@/components/shared';
import { ListCard, QueryState, ScrollScreen, StatTile, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';

import { OrganisationRow } from '../components/OrganisationRow';
import {
  useReadOrganisationsQuery,
  useReadPlatformOverviewQuery,
  useReadPlatformUnreadCountQuery,
} from '../hooks/use_platform_api';

// Tiles show a dash until the totals arrive, so the layout never jumps.
const count = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());
const openOrganisations = () => router.push('/admin/organisations');

// The platform admin's landing page: health of the whole platform at a glance.
export function AdminHomeScreen() {
  const user = useCurrentUser();
  const overview = useReadPlatformOverviewQuery();
  const recent = useReadOrganisationsQuery({ pageSize: 4 });
  const unread = useReadPlatformUnreadCountQuery();
  const refetchUnread = useRef(unread.refetch);
  useEffect(() => {
    refetchUnread.current = unread.refetch;
  });
  // Coming back from notifications clears the badge for what was read there.
  useFocusEffect(useCallback(() => refetchUnread.current(), []));
  const totals = overview.data;
  const organisations = recent.data?.items ?? [];

  const profileButton = <ProfileButton name={user?.fullName ?? ''} />;

  return (
    <ScrollScreen className="gap-6 pt-4">
      <HomeHeader
        left={profileButton}
        right={
          <HeaderButton
            icon={Bell}
            label="Notifications"
            badgeCount={unread.data?.unread ?? 0}
            onPress={() => router.push('/admin/notifications')}
          />
        }
      />
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            label="Organisations"
            value={count(totals?.organisations)}
            caption={`${count(totals?.members)} members`}
            icon={Building2}
            onPress={openOrganisations}
          />
          <StatTile
            label="Executives"
            value={count(totals?.activeExecutives)}
            caption={`${count(totals?.activeHeads)} organisation heads`}
            icon={UsersRound}
            onPress={openOrganisations}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            label="No head"
            value={count(totals?.organisationsWithoutHead)}
            caption="Appoint one to start"
            icon={UserRoundPlus}
            onPress={openOrganisations}
          />
          <StatTile
            label="Suspended"
            value={count(totals?.suspendedExecutives)}
            caption="Executives locked out"
            icon={ShieldAlert}
            onPress={openOrganisations}
          />
        </View>
      </View>

      <ListCard title="Organisations" actionLabel="View all" onAction={openOrganisations}>
        <QueryState
          isLoading={recent.isLoading}
          error={recent.error ?? overview.error}
          isEmpty={organisations.length === 0}
          emptyText="No organisations yet. Create the first one."
          onRetry={() => {
            overview.refetch();
            recent.refetch();
          }}
        />
        {organisations.map((organisation, index) => (
          <OrganisationRow
            key={organisation.id}
            organisation={organisation}
            onPress={() =>
              router.push({
                pathname: '/admin/organisations/[id]',
                params: { id: organisation.id },
              })
            }
            isLast={index === organisations.length - 1}
          />
        ))}
      </ListCard>

      {totals ? (
        <Text variant="caption" className="pb-2 text-center">
          {count(totals.platformAdmins)} platform admins · admin tools only, no member data
        </Text>
      ) : null}
    </ScrollScreen>
  );
}
