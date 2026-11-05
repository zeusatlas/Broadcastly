import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';

import { ApprovalList } from '../components/ApprovalList';
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

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
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
        <ApprovalList
          pages={pages}
          emptyText={query ? 'No approvals match your search.' : 'Nothing here yet.'}
          onSelect={(approval) => setSelectedId(approval.id)}
        />
      </View>
      <ApprovalDetailSheet
        broadcastId={selectedId}
        onClose={() => setSelectedId(null)}
        onDecided={pages.reload}
      />
    </PageScreen>
  );
}
