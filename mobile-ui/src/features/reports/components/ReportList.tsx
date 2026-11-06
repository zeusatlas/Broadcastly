import { CloudOff, ChartNoAxesColumn } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, Skeleton } from '@/components/ui';
import { dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import type { useReportPages } from '../hooks/use_reports';
import type { ReportBroadcastResponse } from '../types';

interface ReportListEmptyProps {
  pages: ReturnType<typeof useReportPages>;
  emptyText: string;
}

export const reportSections = (items: ReportBroadcastResponse[]) =>
  groupIntoSections(items, (item) => dateSectionTitle(item.submittedAt ?? item.createdAt));

// What the list shows when it has no rows: a skeleton, a retryable error, or the empty message.
export function ReportListEmpty({ pages, emptyText }: ReportListEmptyProps) {
  if (pages.isLoading) {
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
  if (pages.error) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Couldn’t load reports"
        description={pages.error.message}
        action={pages.error.isRetryable ? { label: 'Try again', onPress: pages.reload } : undefined}
      />
    );
  }
  return <EmptyState icon={ChartNoAxesColumn} title={emptyText} />;
}
