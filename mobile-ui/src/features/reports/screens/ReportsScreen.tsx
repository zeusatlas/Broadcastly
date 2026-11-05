import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportList } from '../components/ReportList';
import { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse, ReportFilter } from '../types';

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sending', label: 'Sending' },
  { key: 'completed', label: 'Completed' },
  { key: 'partially_failed', label: 'Partial' },
  { key: 'failed', label: 'Failed' },
];

export function ReportsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [selectedReport, setSelectedReport] = useState<ReportBroadcastResponse | null>(null);
  const pages = useReportPages(filter, '');

  const footer = (
    <View className="flex-row items-center gap-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1 rounded-full bg-card"
      >
        <View className="flex-row items-center gap-2 p-2">
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              isSelected={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </View>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search reports"
        onPress={() => router.push('/reports/search')}
        className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
      >
        <Search size={21} color={theme.foreground} />
      </Pressable>
    </View>
  );

  return (
    <PageScreen title="Reports" footer={footer}>
      <View className="gap-5">
        <Text variant="bodyMuted">
          Review broadcast delivery outcomes within your permitted scope.
        </Text>
        {!pages.isLoading && pages.items.length > 0 ? (
          <Text variant="caption">
            {pages.total.toLocaleString()} {pages.total === 1 ? 'report' : 'reports'}
          </Text>
        ) : null}
        <ReportList
          pages={pages}
          emptyText="No reports yet. They appear once a broadcast is sent."
          onSelect={setSelectedReport}
        />
      </View>
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PageScreen>
  );
}
