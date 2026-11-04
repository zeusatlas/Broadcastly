import { ListFilter, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportRow } from '../components/ReportRow';
import { DEMO_REPORTS, type ReportItem, type ReportStatus } from '../reports_data';

const FILTERS: { key: 'all' | ReportStatus; label: string }[] = [
  { key: 'all', label: 'All reports' },
  { key: 'completed', label: 'Completed' },
  { key: 'partially_failed', label: 'Partial' },
  { key: 'pending', label: 'Pending' },
];

export function ReportsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | ReportStatus>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const reports = useMemo(
    () => DEMO_REPORTS.filter((report) => filter === 'all' || report.status === filter),
    [filter],
  );
  const selectedFilter = FILTERS.find((item) => item.key === filter)?.label ?? 'All reports';
  const footer = (
    <View className="flex-row items-center justify-between gap-3">
      <View
        className={cn(
          'flex-row items-center gap-2 rounded-full',
          filter !== 'all' && 'bg-card pr-3',
        )}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open report filters"
          onPress={() => setIsFilterOpen((open) => !open)}
          className={cn(
            'h-14 w-14 items-center justify-center rounded-full',
            filter !== 'all' ? 'bg-primary' : 'bg-card',
          )}
        >
          <ListFilter
            size={21}
            color={filter !== 'all' ? theme.primaryForeground : theme.foreground}
          />
        </Pressable>
        {filter !== 'all' ? (
          <Text className="px-1 font-sans-semibold text-base text-foreground">
            {selectedFilter}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search reports"
        onPress={() => router.push('/reports/search')}
        className="h-14 w-14 items-center justify-center rounded-full bg-card"
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
        <Text variant="caption">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </Text>
        <View>
          {reports.map((report, index) => (
            <ReportRow
              key={report.id}
              report={report}
              isLast={index === reports.length - 1}
              onPress={() => setSelectedReport(report)}
            />
          ))}
        </View>
      </View>
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
      <Modal
        visible={isFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close report filters"
            onPress={() => setIsFilterOpen(false)}
            className="flex-1"
          />
          <View
            className="rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="heading">Filter reports</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close report filters"
                onPress={() => setIsFilterOpen(false)}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            {FILTERS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ checked: item.key === filter }}
                onPress={() => {
                  setFilter(item.key);
                  setIsFilterOpen(false);
                }}
                className="flex-row items-center justify-between border-b border-border py-4"
              >
                <Text className="font-sans-semibold text-base text-foreground">{item.label}</Text>
                <View
                  className={cn(
                    'h-6 w-6 rounded-full border',
                    item.key === filter ? 'border-primary bg-primary' : 'border-input',
                  )}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </PageScreen>
  );
}
