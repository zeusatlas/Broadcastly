import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { FilterButton, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import { ApprovalListEmpty, approvalSections } from '../components/ApprovalList';
import { ApprovalRow } from '../components/ApprovalRow';
import { useApprovalPages } from '../hooks/use_approvals';
import type { ApprovalFilter } from '../types';
import { ApprovalDetailSheet } from './ApprovalDetailSheet';

const FILTERS: { key: ApprovalFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'decided', label: 'Decided' },
];

const EMPTY_TEXT: Record<ApprovalFilter, string> = {
  pending: 'Nothing is waiting for your review.',
  decided: 'You have not decided on any broadcasts yet.',
};

export function ApprovalsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ApprovalFilter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pages = useApprovalPages(filter, '');
  const sections = useMemo(() => approvalSections(pages.items, filter), [pages.items, filter]);

  return (
    <>
      <SectionListPage
        title="Approvals"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={(item, { isLast }) => (
          <ApprovalRow approval={item} isLast={isLast} onPress={() => setSelectedId(item.id)} />
        )}
        onEndReached={pages.loadMore}
        isLoadingMore={pages.hasNextPage && pages.isFetching}
        isRefreshing={pages.isFetching && !pages.isLoading}
        onRefresh={pages.reload}
        header={
          <>
            <Text variant="bodyMuted">
              Review broadcasts submitted for your approval before they are sent.
            </Text>
            {!pages.isLoading && pages.items.length > 0 ? (
              <Text variant="caption">
                {pages.total.toLocaleString()}{' '}
                {filter === 'pending'
                  ? `${pages.total === 1 ? 'broadcast' : 'broadcasts'} waiting`
                  : 'decided'}
              </Text>
            ) : null}
          </>
        }
        empty={<ApprovalListEmpty pages={pages} emptyText={EMPTY_TEXT[filter]} />}
        footer={
          <View className="flex-row items-center justify-between gap-3">
            <FilterButton
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              defaultValue="pending"
              title="Filter approvals"
              description="Show broadcasts waiting for review or ones you have decided."
              accessibilityLabel="Open approval filters"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search approvals"
              onPress={() =>
                router.push({ pathname: '/approvals/search', params: { status: filter } })
              }
              className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
            >
              <Search size={21} color={theme.foreground} />
            </Pressable>
          </View>
        }
      />
      <ApprovalDetailSheet
        broadcastId={selectedId}
        onClose={() => setSelectedId(null)}
        onDecided={pages.reload}
      />
    </>
  );
}
