import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportList } from '../components/ReportList';
import { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse } from '../types';

export function ReportsSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportBroadcastResponse | null>(null);
  const query = useDebouncedValue(search.trim());
  const pages = useReportPages('all', query);

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
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
        <ReportList
          pages={pages}
          emptyText={query ? 'No reports match your search.' : 'No reports yet.'}
          onSelect={setSelectedReport}
        />
      </View>
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PageScreen>
  );
}
