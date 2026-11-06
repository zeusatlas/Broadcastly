import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { SectionListPage } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportListEmpty, reportSections } from '../components/ReportList';
import { ReportRow } from '../components/ReportRow';
import { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse } from '../types';

export function ReportsSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportBroadcastResponse | null>(null);
  const query = useDebouncedValue(search.trim());
  const pages = useReportPages('all', query);
  const sections = useMemo(() => reportSections(pages.items), [pages.items]);

  return (
    <>
      <SectionListPage
        backIcon={X}
        backLabel="Close search"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={(item, { isLast }) => (
          <ReportRow report={item} isLast={isLast} onPress={() => setSelectedReport(item)} />
        )}
        onEndReached={pages.loadMore}
        isLoadingMore={pages.hasNextPage && pages.isFetching}
        header={
          <>
            <SearchField
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search reports"
              className="h-14"
            />
            {query && !pages.isLoading && !pages.error ? (
              <Text variant="caption">
                {pages.total.toLocaleString()} {pages.total === 1 ? 'report' : 'reports'} found
              </Text>
            ) : null}
          </>
        }
        empty={
          <ReportListEmpty
            pages={pages}
            emptyText={query ? 'No reports match your search.' : 'No reports yet.'}
          />
        }
      />
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
    </>
  );
}
