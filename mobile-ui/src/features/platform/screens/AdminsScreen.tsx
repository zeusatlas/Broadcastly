import { router, useFocusEffect } from 'expo-router';
import { UserRoundPlus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SectionListPage } from '@/components/shared';
import { QueryState, Text } from '@/components/ui';
import { useCurrentUser, useHasPermission } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/use_pages';
import { groupIntoSections, letterSectionTitle } from '@/utils/helpers';

import { InlineSearch, ListFooter } from '../components/ListFooter';
import { PersonRow } from '../components/PersonRow';
import { usePlatformAdminPages } from '../hooks/use_platform_api';
import type { PlatformAdminResponse, PlatformAdminStatus } from '../types';

type Filter = 'all' | PlatformAdminStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All admins' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

function roleLine(admin: PlatformAdminResponse, isYou: boolean) {
  const role = admin.isSuperAdmin
    ? 'Main admin'
    : `${admin.permissions.length} ${admin.permissions.length === 1 ? 'permission' : 'permissions'}`;
  return `${isYou ? 'You · ' : ''}${role} · ${admin.email}`;
}

export function AdminsScreen() {
  const me = useCurrentUser();
  const canManage = useHasPermission('platform.admin.manage');
  const [filter, setFilter] = useState<Filter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = usePlatformAdminPages({
    status: filter === 'all' ? undefined : filter,
    search: query || undefined,
  });
  // The API lists main admins first, then everyone else by name.
  const sections = useMemo(
    () =>
      groupIntoSections(pages.items, (item) =>
        item.isSuperAdmin ? 'Main admin' : letterSectionTitle(item.firstName),
      ),
    [pages.items],
  );
  const reload = useRef(pages.reload);
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = pages.reload;
  });

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  const closeSearch = () => {
    setSearch('');
    setIsSearching(false);
  };

  return (
    <SectionListPage
      title="Admins"
      isTabRoot
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <PersonRow
          name={item.fullName}
          detail={roleLine(item, item.id === me?.id)}
          status={item.status}
          isLast={isLast}
          onPress={() => router.push({ pathname: '/admin/admins/[id]', params: { id: item.id } })}
        />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      header={
        <>
          {isSearching ? (
            <InlineSearch
              value={search}
              onChangeText={setSearch}
              placeholder="Search name or email"
              onClose={closeSearch}
            />
          ) : null}
          <Text variant="bodyMuted">
            The main admin can do everything. Other admins can do only what they were given.
          </Text>
        </>
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText={query ? 'No admins match your search.' : 'No admins here.'}
          onRetry={pages.reload}
        />
      }
      footer={
        <ListFooter
          filter={{
            options: FILTERS,
            value: filter,
            onChange: setFilter,
            defaultValue: 'all',
            title: 'Filter admins',
            description: 'Choose an account status.',
            accessibilityLabel: 'Open admin filters',
            total: pages.total,
          }}
          isSearching={isSearching}
          onToggleSearch={() => (isSearching ? closeSearch() : setIsSearching(true))}
          searchLabel="Search admins"
          action={
            canManage
              ? {
                  label: 'New',
                  accessibilityLabel: 'Add platform admin',
                  icon: UserRoundPlus,
                  onPress: () => router.push('/admin/admins/new'),
                }
              : undefined
          }
        />
      }
    />
  );
}
