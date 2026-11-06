import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { FilterButton, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportListEmpty, reportSections } from '../components/ReportList';
import { ReportRow } from '../components/ReportRow';
import { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse, ReportFilter } from '../types';

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sending', label: 'Sending' },
  { key: 'completed', label: 'Completed' },
  { key: 'partially_failed', label: 'Partially failed' },
  { key: 'failed', label: 'Failed' },
];

export function ReportsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [selectedReport, setSelectedReport] = useState<ReportBroadcastResponse | null>(null);
  const pages = useReportPages(filter, '');
  const sections = useMemo(() => reportSections(pages.items), [pages.items]);

  return (
    <>
      <SectionListPage
        title="Reports"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={(item, { isLast }) => (
          <ReportRow report={item} isLast={isLast} onPress={() => setSelectedReport(item)} />
        )}
        onEndReached={pages.loadMore}
        isLoadingMore={pages.hasNextPage && pages.isFetching}
        isRefreshing={pages.isFetching && !pages.isLoading}
        onRefresh={pages.reload}
        header={
          <>
            <Text variant="bodyMuted">
              Review broadcast delivery outcomes within your permitted scope.
            </Text>
            {!pages.isLoading && pages.items.length > 0 ? (
              <Text variant="caption">
                {pages.total.toLocaleString()} {pages.total === 1 ? 'report' : 'reports'}
              </Text>
            ) : null}
          </>
        }
        empty={
          <ReportListEmpty
            pages={pages}
            emptyText="No reports yet. They appear once a broadcast is sent."
          />
        }
        footer={
          <View className="flex-row items-center justify-between gap-3">
            <FilterButton
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              defaultValue="all"
              title="Filter reports"
              description="Choose a delivery outcome."
              accessibilityLabel="Open report filters"
              total={pages.total}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search reports"
              onPress={() => router.push('/reports/search')}
              className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
            >
              <Search size={21} color={theme.foreground} />
            </Pressable>
          </View>
        }
      />
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  );
}
