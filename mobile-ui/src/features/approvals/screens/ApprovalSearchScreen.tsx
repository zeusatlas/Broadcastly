import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { SectionListPage } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';

import { ApprovalListEmpty, approvalSections } from '../components/ApprovalList';
import { ApprovalRow } from '../components/ApprovalRow';
import { useApprovalPages } from '../hooks/use_approvals';
import type { ApprovalFilter } from '../types';
import { ApprovalDetailSheet } from './ApprovalDetailSheet';

export function ApprovalSearchScreen() {
  const [search, setSearch] = useState('');
  // Searches the queue the list screen was showing: the API has no combined pending + decided search.
  const params = useLocalSearchParams<{ status?: string }>();
  const filter: ApprovalFilter = params.status === 'decided' ? 'decided' : 'pending';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim());
  const pages = useApprovalPages(filter, query);
  const sections = useMemo(() => approvalSections(pages.items, filter), [pages.items, filter]);

  return (
    <>
      <SectionListPage
        backIcon={X}
        backLabel="Close search"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={(item, { isLast }) => (
          <ApprovalRow approval={item} isLast={isLast} onPress={() => setSelectedId(item.id)} />
        )}
        onEndReached={pages.loadMore}
        isLoadingMore={pages.hasNextPage && pages.isFetching}
        header={
          <>
            <SearchField
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder={
                filter === 'pending' ? 'Search pending approvals' : 'Search decided approvals'
              }
              className="h-14"
            />
            {query && !pages.isLoading && !pages.error ? (
              <Text variant="caption">
                {pages.total.toLocaleString()} {pages.total === 1 ? 'approval' : 'approvals'} found
              </Text>
            ) : null}
          </>
        }
        empty={
          <ApprovalListEmpty
            pages={pages}
            emptyText={query ? 'No approvals match your search.' : 'Nothing here yet.'}
          />
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
