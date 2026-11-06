import { CloudOff, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, Skeleton } from '@/components/ui';
import { dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import type { useApprovalPages } from '../hooks/use_approvals';
import type { ApprovalBroadcastResponse, ApprovalFilter } from '../types';

interface ApprovalListEmptyProps {
  pages: ReturnType<typeof useApprovalPages>;
  emptyText: string;
}

// Waiting approvals group by when they were submitted; decided ones by when the decision was made.
export function approvalSections(items: ApprovalBroadcastResponse[], filter: ApprovalFilter) {
  return groupIntoSections(items, (item) =>
    dateSectionTitle(
      filter === 'decided'
        ? (item.latestDecision?.decidedAt ?? item.submittedAt)
        : (item.submittedAt ?? item.createdAt),
    ),
  );
}

// What the list shows when it has no rows: a skeleton, a retryable error, or the empty message.
export function ApprovalListEmpty({ pages, emptyText }: ApprovalListEmptyProps) {
  if (pages.isLoading) {
    return (
      <View accessibilityLabel="Loading approvals">
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} className="flex-row gap-3 border-b border-border py-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (pages.error) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Couldn’t load approvals"
        description={pages.error.message}
        action={pages.error.isRetryable ? { label: 'Try again', onPress: pages.reload } : undefined}
      />
    );
  }
  return <EmptyState icon={ShieldCheck} title={emptyText} />;
}
