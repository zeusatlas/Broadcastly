import { ScrollText } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { Badge, FilterGroupsButton, QueryState, type FilterGroup } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';
import { dateSectionTitle, formatDateTime, groupIntoSections } from '@/utils/helpers';

import { ActivityRow } from '../components/AdminRows';
import { InlineSearch } from '../components/ListFooter';
import { useAuditLogPages } from '../hooks/use_platform_api';
import type { PlatformPeriod } from '../types';
import { auditLabel, PERIOD_OPTIONS } from '../utils/admin_labels';

const ROLE = { executive: 'Executive', platform_admin: 'Broadcastly admin' } as const;

// Who did what, and when, across the platform (NFR-SEC-05). Newest first; read only.
export function AuditLogScreen() {
  const [period, setPeriod] = useState<PlatformPeriod>('last_7_days');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = useAuditLogPages({ period, actor: query || undefined });
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

  const groups: FilterGroup[] = [
    {
      title: 'Period',
      options: PERIOD_OPTIONS,
      value: period,
      defaultValue: 'last_7_days',
      onChange: (value) => setPeriod(value as PlatformPeriod),
    },
  ];

  return (
    <SectionListPage
      title="Audit log"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <ActivityRow
          title={auditLabel(item.action)}
          detail={[
            item.actor ?? 'System',
            item.actorRole ? ROLE[item.actorRole] : null,
            item.organisationName,
          ]
            .filter(Boolean)
            .join(' · ')}
          meta={formatDateTime(item.createdAt)}
          trailing={
            item.outcome === 'failure' ? (
              <Badge label="Failed" tone="destructive" variant="subtle" />
            ) : undefined
          }
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
          placeholder="Search by person"
          onClose={() => setSearch('')}
        />
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText={query ? 'Nothing matches' : 'Nothing recorded'}
          emptyDescription={
            query ? 'No one by that name did anything in this period.' : 'Try a longer period.'
          }
          emptyIcon={ScrollText}
          onRetry={pages.reload}
        />
      }
      footer={
        <View className="flex-row">
          <FilterGroupsButton
            groups={groups}
            onReset={() => setPeriod('last_7_days')}
            title="Filter the audit log"
            description="Choose a period."
            accessibilityLabel="Open audit log filters"
          />
        </View>
      }
    />
  );
}
