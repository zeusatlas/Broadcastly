import { router, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SectionListPage } from '@/components/shared';
import { QueryState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/use_pages';
import { groupIntoSections, letterSectionTitle } from '@/utils/helpers';

import { InlineSearch, ListFooter } from '../components/ListFooter';
import { OrganisationRow } from '../components/OrganisationRow';
import { useOrganisationPages } from '../hooks/use_platform_api';
import type { ListOrganisationsParams } from '../types';

type Filter = 'all' | 'active' | 'suspended' | 'no_head';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All organisations' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'no_head', label: 'No head yet' },
];

const FILTER_PARAMS: Record<Filter, Omit<ListOrganisationsParams, 'page' | 'pageSize'>> = {
  all: {},
  active: { status: 'active' },
  suspended: { status: 'suspended' },
  no_head: { status: 'active', hasHead: false },
};

export function OrganisationsScreen() {
  const canManage = useHasPermission('platform.organisation.manage');
  const [filter, setFilter] = useState<Filter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = useOrganisationPages({ ...FILTER_PARAMS[filter], search: query || undefined });
  // The API returns organisations by name, so A–Z sections follow its order.
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => letterSectionTitle(item.name)),
    [pages.items],
  );
  const reload = useRef(pages.reload);
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = pages.reload;
  });

  // Back from creating or changing an organisation, show the new state.
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
      title="Organisations"
      isTabRoot
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <OrganisationRow
          organisation={item}
          isLast={isLast}
          onPress={() =>
            router.push({ pathname: '/admin/organisations/[id]', params: { id: item.id } })
          }
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
              placeholder="Search organisations"
              onClose={closeSearch}
            />
          ) : null}
          {!pages.isLoading && pages.items.length > 0 ? (
            <Text variant="caption">
              {pages.total.toLocaleString()} {pages.total === 1 ? 'organisation' : 'organisations'}
            </Text>
          ) : null}
        </>
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText={query ? 'No organisations match your search.' : 'No organisations here.'}
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
            title: 'Filter organisations',
            description: 'Choose which organisations to show.',
            accessibilityLabel: 'Open organisation filters',
            total: pages.total,
          }}
          isSearching={isSearching}
          onToggleSearch={() => (isSearching ? closeSearch() : setIsSearching(true))}
          searchLabel="Search organisations"
          action={
            canManage
              ? {
                  label: 'New',
                  accessibilityLabel: 'New organisation',
                  icon: Plus,
                  onPress: () => router.push('/admin/organisations/new'),
                }
              : undefined
          }
        />
      }
    />
  );
}
