import { View } from 'react-native';

import { Button, Skeleton, Text } from '@/components/ui';

import type { useApprovalPages } from '../hooks/use_approvals';
import type { ApprovalBroadcastResponse } from '../types';
import { ApprovalRow } from './ApprovalRow';

interface ApprovalListProps {
  pages: ReturnType<typeof useApprovalPages>;
  emptyText: string;
  onSelect: (approval: ApprovalBroadcastResponse) => void;
}

function ApprovalSkeleton() {
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

export function ApprovalList({ pages, emptyText, onSelect }: ApprovalListProps) {
  if (pages.isLoading) return <ApprovalSkeleton />;
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
      {pages.items.map((approval, index) => (
        <ApprovalRow
          key={approval.id}
          approval={approval}
          isLast={index === pages.items.length - 1}
          onPress={() => onSelect(approval)}
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
