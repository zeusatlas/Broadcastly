import { ChevronDown, ListFilter, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { ApprovalRow } from '../components/ApprovalRow';
import { DEMO_APPROVALS, type ApprovalItem } from '../demo_data';
import { ApprovalDetailSheet } from './ApprovalDetailSheet';

type ApprovalFilter = 'all' | 'today' | 'earlier';

const FILTERS: { key: ApprovalFilter; label: string }[] = [
  { key: 'all', label: 'All approvals' },
  { key: 'today', label: 'Submitted today' },
  { key: 'earlier', label: 'Submitted earlier' },
];

export function ApprovalsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const approvals = useMemo(
    () => DEMO_APPROVALS.filter((approval) => filter === 'all' || approval.submittedPeriod === filter),
    [filter],
  );
  const selectedFilter = FILTERS.find((item) => item.key === filter)?.label ?? 'All approvals';
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
          accessibilityLabel="Open approval filters"
          accessibilityState={{ selected: filter !== 'all' }}
          onPress={() => setIsFilterOpen((open) => !open)}
          className={cn(
            'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
            filter !== 'all' ? 'bg-primary' : 'bg-card',
          )}
        >
          <ListFilter
            size={21}
            color={filter !== 'all' ? theme.primaryForeground : theme.foreground}
          />
        </Pressable>
        {filter !== 'all' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Current filter: ${selectedFilter}`}
            onPress={() => setIsFilterOpen((open) => !open)}
            className="flex-row items-center gap-1 px-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-base text-foreground">
              {selectedFilter}
            </Text>
            <ChevronDown size={17} color={theme.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search approvals"
        onPress={() => router.push('/approvals/search')}
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
        <Text variant="caption">
          {approvals.length} {approvals.length === 1 ? 'broadcast' : 'broadcasts'} waiting
        </Text>
        <View>
          {approvals.length > 0 ? (
            approvals.map((approval, index) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                isLast={index === approvals.length - 1}
                onPress={() => setSelectedApproval(approval)}
              />
            ))
          ) : (
            <View className="items-center gap-2 py-16">
              <Text variant="heading">No approvals found</Text>
              <Text variant="bodyMuted" className="text-center">
                Nothing is waiting for your review.
              </Text>
            </View>
          )}
        </View>
      </View>
      <ApprovalDetailSheet
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
      />

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close approval filters"
            onPress={() => setIsFilterOpen(false)}
            className="flex-1"
          />
          <View
            className="max-h-[72%] rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text variant="heading">Filter approvals</Text>
                <Text variant="caption">Choose when they were submitted.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close approval filters"
                onPress={() => setIsFilterOpen(false)}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            {FILTERS.map((item) => {
              const isSelected = item.key === filter;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => {
                    setFilter(item.key);
                    setIsFilterOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
                >
                  <Text className="font-sans-semibold text-base text-foreground">
                    {item.label}
                  </Text>
                  <View
                    className={cn(
                      'h-6 w-6 rounded-full border-2',
                      isSelected ? 'border-primary bg-primary' : 'border-input',
                    )}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </PageScreen>
  );
}
