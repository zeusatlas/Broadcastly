import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import { ApprovalList } from '../components/ApprovalList';
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

  const footer = (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2 rounded-full bg-card p-2">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            isSelected={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search approvals"
        onPress={() => router.push({ pathname: '/approvals/search', params: { status: filter } })}
        className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
      >
        <Search size={21} color={theme.foreground} />
      </Pressable>
    </View>
  );

  return (
    <PageScreen title="Approvals" footer={footer}>
      <View className="gap-5">
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
        <ApprovalList
          pages={pages}
          emptyText={EMPTY_TEXT[filter]}
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
