import { useLocalSearchParams } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { FilterGroupsButton, QueryState, type FilterGroup } from '@/components/ui';
import { BroadcastStatusBadge, type BroadcastStatus } from '@/features/broadcasts';
import { useDebouncedValue } from '@/hooks/use_pages';
import { dateSectionTitle, formatDateTime, groupIntoSections } from '@/utils/helpers';

import { ActivityRow } from '../components/AdminRows';
import { InlineSearch } from '../components/ListFooter';
import { usePlatformBroadcastPages } from '../hooks/use_platform_api';
import type { PlatformPeriod } from '../types';
import { PERIOD_OPTIONS } from '../utils/admin_labels';

const STATUSES: { key: 'all' | BroadcastStatus; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'completed', label: 'Delivered' },
  { key: 'partially_failed', label: 'Partly failed' },
  { key: 'failed', label: 'Failed' },
  { key: 'processing', label: 'Sending' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'pending_approval', label: 'Waiting for approval' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Every organisation's broadcasts (or one organisation's), for support and oversight. Read only.
export function PlatformBroadcastsScreen() {
  const params = useLocalSearchParams<{ organisationId?: string; organisationName?: string }>();
  const [period, setPeriod] = useState<PlatformPeriod>('all_time');
  const [status, setStatus] = useState<'all' | BroadcastStatus>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = usePlatformBroadcastPages({
    period,
    status: status === 'all' ? undefined : status,
    search: query || undefined,
    organisationId: params.organisationId,
  });
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

  const groups: FilterGroup[] = [
    {
      title: 'Period',
      options: PERIOD_OPTIONS,
      value: period,
      defaultValue: 'all_time',
      onChange: (value) => setPeriod(value as PlatformPeriod),
    },
    {
      title: 'Status',
      options: STATUSES,
      value: status,
      defaultValue: 'all',
      onChange: (value) => setStatus(value as 'all' | BroadcastStatus),
    },
  ];

  return (
    <SectionListPage
      title={params.organisationName ? `${params.organisationName} broadcasts` : 'Broadcasts'}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <ActivityRow
          title={item.title ?? 'Untitled broadcast'}
          detail={[params.organisationId ? null : item.organisationName, item.audienceSummary]
            .filter(Boolean)
            .join(' · ')}
          meta={`${item.recipientCount.toLocaleString()} recipients · ${item.deliveredCount.toLocaleString()} delivered · ${formatDateTime(item.createdAt)}`}
          trailing={<BroadcastStatusBadge status={item.status} />}
          isLast={isLast}
        />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      header={
        <InlineSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Search title or message"
          onClose={() => setSearch('')}
        />
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText={query ? 'Nothing matches' : 'No broadcasts here'}
          emptyDescription={query ? 'No broadcasts match your search.' : undefined}
          emptyIcon={Megaphone}
          onRetry={pages.reload}
        />
      }
      footer={
        <View className="flex-row">
          <FilterGroupsButton
            groups={groups}
            onReset={() => {
              setPeriod('all_time');
              setStatus('all');
            }}
            title="Filter broadcasts"
            description="Choose a period and a status."
            accessibilityLabel="Open broadcast filters"
          />
        </View>
      }
    />
  );
}
