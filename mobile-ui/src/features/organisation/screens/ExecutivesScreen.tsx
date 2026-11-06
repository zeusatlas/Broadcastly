import { router, useFocusEffect } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { Button, FilterButton, QueryState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { groupIntoSections, letterSectionTitle } from '@/utils/helpers';

import { ExecutiveRow } from '../components/ExecutiveRow';
import { useExecutivePages } from '../hooks/use_organisation_api';
import type { ExecutiveResponse } from '../types';

type ExecutiveFilter = 'all' | 'active' | 'suspended';

const FILTERS: { key: ExecutiveFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

const toRow = (executive: ExecutiveResponse) => ({
  id: executive.id,
  name: executive.fullName,
  position: executive.appointments[0]?.positionTitle ?? 'No appointment',
  unit: executive.appointments[0]?.unitName ?? 'Organisation-wide',
  status: executive.status,
  email: executive.email,
  phone: executive.phone ?? 'No phone number',
  permissions: executive.appointments.flatMap((appointment) => appointment.permissions),
});

export function ExecutivesScreen() {
  const theme = useTheme();
  const canManage = useHasPermission('appointment.manage');
  const [filter, setFilter] = useState<ExecutiveFilter>('all');
  const pages = useExecutivePages(filter === 'all' ? {} : { status: filter });
  // The API returns executives by first name, so A–Z sections follow its order.
  const sections = useMemo(
    () => groupIntoSections(pages.items.map(toRow), (item) => letterSectionTitle(item.name)),
    [pages.items],
  );
  const reload = useRef(pages.reload);
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = pages.reload;
  });

  // Back from appointing someone, show them.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  return (
    <SectionListPage
      title="Executives"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => <ExecutiveRow executive={item} isLast={isLast} />}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      header={
        <>
          <Text variant="bodyMuted">
            Browse appointments within your permitted scope. Permissions are enforced by the server.
          </Text>
          {!pages.isLoading && pages.items.length > 0 ? (
            <Text variant="caption">
              {pages.total.toLocaleString()} {pages.total === 1 ? 'executive' : 'executives'}
            </Text>
          ) : null}
        </>
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText="There are no executives in this view."
          onRetry={pages.reload}
        />
      }
      footer={
        <View className="flex-row items-center justify-between gap-3">
          <FilterButton
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            defaultValue="all"
            title="Filter executives"
            description="Choose an account status."
            accessibilityLabel="Open executive filters"
            total={pages.total}
          />
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search executives"
              onPress={() => router.push('/executives/search')}
              className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
            >
              <Search size={21} color={theme.foreground} />
            </Pressable>
            {canManage ? (
              <Button
                label="New"
                accessibilityLabel="New executive"
                icon={Plus}
                variant="accent"
                shape="pill"
                onPress={() => router.push('/executives/new')}
              />
            ) : null}
          </View>
        </View>
      }
    />
  );
}
