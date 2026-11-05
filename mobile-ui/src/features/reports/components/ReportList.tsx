import { View } from 'react-native';

import { Button, Skeleton, Text } from '@/components/ui';

import type { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse } from '../types';
import { ReportRow } from './ReportRow';

interface ReportListProps {
  pages: ReturnType<typeof useReportPages>;
  emptyText: string;
  onSelect: (report: ReportBroadcastResponse) => void;
}

function ReportSkeleton() {
  return (
    <View accessibilityLabel="Loading reports">
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} className="gap-2 border-b border-border py-4">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-full rounded-md" />
        </View>
      ))}
    </View>
  );
}

export function ReportList({ pages, emptyText, onSelect }: ReportListProps) {
  if (pages.isLoading) return <ReportSkeleton />;
  if (pages.error && pages.items.length === 0) {
    return (
      <View className="items-center gap-3 py-16">
        <Text variant="bodyMuted" className="text-center">
          {pages.error.message}
        </Text>
        {pages.error.isRetryable ? (
          <Button label="Try again" variant="outline" onPress={pages.reload} />
        ) : null}
      </View>
    );
  }
  if (pages.items.length === 0) {
    return (
      <Text variant="bodyMuted" className="py-16 text-center">
        {emptyText}
      </Text>
    );
  }

  return (
    <View>
      {pages.items.map((report, index) => (
        <ReportRow
          key={report.id}
          report={report}
          isLast={index === pages.items.length - 1}
          onPress={() => onSelect(report)}
        />
      ))}
      {pages.hasNextPage ? (
        <Button
          label="Show more"
          variant="outline"
          className="mt-4"
          isLoading={pages.isFetching}
          loadingLabel="Loading…"
          onPress={pages.loadMore}
        />
      ) : null}
    </View>
  );
}
