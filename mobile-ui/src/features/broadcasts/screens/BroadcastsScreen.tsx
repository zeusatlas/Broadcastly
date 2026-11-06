import { router, useFocusEffect } from 'expo-router';
import { CloudOff, Inbox, Search, SearchX, SquarePen, X } from 'lucide-react-native';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Pressable,
  RefreshControl,
  SectionList,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import {
  Button,
  EmptyState,
  FilterGroupsButton,
  SearchField,
  Text,
  type FilterGroup,
} from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { BroadcastListSkeleton } from '../components/BroadcastListSkeleton';
import { BroadcastRow } from '../components/BroadcastRow';
import { useBroadcastPages, type BroadcastListFilters } from '../hooks/use_broadcasts';
import type { BroadcastStatus, BroadcastSummary } from '../types';
import { toBroadcastSummary } from '../utils/broadcast_mapper';

type GroupBy = 'date' | 'stage';
type SortBy = 'newest' | 'oldest';
type Owner = 'all' | 'mine';
type StatusFilter = 'all' | 'drafts' | 'pending' | 'scheduled' | 'sent' | 'failed';

interface BroadcastSection {
  title: string;
  data: BroadcastSummary[];
}

const STATUS_FILTERS: { key: StatusFilter; label: string; statuses?: BroadcastStatus[] }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'drafts', label: 'Drafts', statuses: ['draft'] },
  { key: 'pending', label: 'Waiting for approval', statuses: ['pending_approval', 'approved'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { key: 'sent', label: 'Sent', statuses: ['processing', 'submitted', 'completed'] },
  { key: 'failed', label: 'Not fully sent', statuses: ['partially_failed', 'failed', 'cancelled'] },
];

// Same stages, in the same order, as the API's group-by-status sort: work to finish comes first.
const STAGE_OF: Record<BroadcastStatus, string> = {
  draft: 'Drafts to finish',
  pending_approval: 'Waiting for approval',
  approved: 'Waiting for approval',
  partially_failed: 'Not fully sent',
  failed: 'Not fully sent',
  cancelled: 'Not fully sent',
  scheduled: 'Scheduled',
  processing: 'Sending now',
  submitted: 'Sending now',
  completed: 'Sent',
};

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<BroadcastSummary, BroadcastSection>,
);

const DAY_MS = 24 * 60 * 60 * 1000;

function dateSection(iso: string, now: Date) {
  const date = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day === today) return 'Today';
  if (day === today - DAY_MS) return 'Yesterday';
  if (day > today - 7 * DAY_MS) return 'This week';
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'Earlier this month';
  }
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Pages arrive already ordered by the server, so sections are runs of equal titles.
function toSections(items: BroadcastSummary[], groupBy: GroupBy) {
  const now = new Date();
  const sections: BroadcastSection[] = [];
  for (const item of items) {
    const title = groupBy === 'stage' ? STAGE_OF[item.status] : dateSection(item.createdAt, now);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

export function BroadcastsScreen() {
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle('Broadcasts', { header: 'tab' });
  const theme = useTheme();
  const canDraft = useHasPermission('broadcast.draft');
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [owner, setOwner] = useState<Owner>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const filters: BroadcastListFilters = {
    statuses: STATUS_FILTERS.find((item) => item.key === status)?.statuses,
    mine: owner === 'mine' ? true : undefined,
    sort: sortBy === 'oldest' ? 'oldest' : undefined,
    groupBy: groupBy === 'stage' ? 'status' : undefined,
  };
  const broadcasts = useBroadcastPages(deferredSearch, filters);
  const items = useMemo(() => broadcasts.items.map(toBroadcastSummary), [broadcasts.items]);
  const sections = useMemo(() => toSections(items, groupBy), [items, groupBy]);
  const reload = useRef(broadcasts.reload);
  const hasFocusedOnce = useRef(false);
  const hasMountedOnce = useRef(false);

  useEffect(() => {
    reload.current = broadcasts.reload;
  });

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && hasMountedOnce.current) reload.current();
      hasMountedOnce.current = true;
    });
    return () => subscription.remove();
  }, []);

  const groups: FilterGroup[] = [
    {
      title: 'Group by',
      options: [
        { key: 'date', label: 'Date' },
        { key: 'stage', label: 'What needs doing' },
      ],
      value: groupBy,
      defaultValue: 'date',
      onChange: (value) => setGroupBy(value as GroupBy),
    },
    {
      title: 'Order',
      options: [
        { key: 'newest', label: 'Newest first' },
        { key: 'oldest', label: 'Oldest first' },
      ],
      value: sortBy,
      defaultValue: 'newest',
      onChange: (value) => setSortBy(value as SortBy),
    },
    {
      title: 'Show',
      options: [
        { key: 'all', label: 'All I can see' },
        { key: 'mine', label: 'Only mine' },
      ],
      value: owner,
      defaultValue: 'all',
      onChange: (value) => setOwner(value as Owner),
    },
    {
      title: 'Status',
      options: STATUS_FILTERS,
      value: status,
      defaultValue: 'all',
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];
  const isFiltered = groups.some((group) => group.value !== group.defaultValue);

  const resetFilters = () => {
    setGroupBy('date');
    setSortBy('newest');
    setOwner('all');
    setStatus('all');
  };

  const closeSearch = () => {
    setSearch('');
    setIsSearching(false);
    Keyboard.dismiss();
  };

  return (
    <>
      <AnimatedSectionList
        sections={sections}
        stickySectionHeadersEnabled={false}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={broadcasts.isFetching && !broadcasts.isLoading}
            onRefresh={broadcasts.reload}
          />
        }
        keyExtractor={(item) => item.id}
        onEndReached={broadcasts.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 84,
        }}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            {collapsing.largeTitle}
            {isSearching ? (
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <SearchField
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="Search title, message or audience"
                    autoFocus
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  onPress={closeSearch}
                  className="h-12 w-12 items-center justify-center rounded-full bg-card active:opacity-70"
                >
                  <X size={20} color={theme.foreground} />
                </Pressable>
              </View>
            ) : null}
            {broadcasts.error && items.length > 0 ? (
              <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
                <Text variant="caption" className="flex-1">
                  Couldn’t refresh broadcasts.
                </Text>
                {broadcasts.error.isRetryable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry refreshing broadcasts"
                    onPress={broadcasts.reload}
                    className="min-h-11 justify-center px-2"
                  >
                    <Text className="font-sans-semibold text-primary">Retry</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Text variant="caption">
                {broadcasts.total.toLocaleString()}{' '}
                {broadcasts.total === 1 ? 'broadcast' : 'broadcasts'}
              </Text>
              {broadcasts.isFetching && items.length > 0 ? (
                <ActivityIndicator
                  accessibilityLabel="Refreshing broadcasts"
                  color={theme.mutedForeground}
                />
              ) : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-baseline justify-between bg-background pb-1 pt-5">
            <Text
              accessibilityRole="header"
              className="font-sans-bold text-xs uppercase tracking-widest text-accent-emphasis"
            >
              {section.title}
            </Text>
            <Text variant="caption">{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Animated.View entering={enterRow(index)}>
            <BroadcastRow
              broadcast={item}
              isLast={index === section.data.length - 1}
              onPress={() => router.push({ pathname: '/broadcasts/[id]', params: { id: item.id } })}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          broadcasts.isLoading ? (
            <BroadcastListSkeleton />
          ) : broadcasts.error ? (
            <EmptyState
              icon={CloudOff}
              title="Couldn’t load broadcasts"
              description={broadcasts.error.message}
              action={
                broadcasts.error.isRetryable
                  ? { label: 'Try again', onPress: broadcasts.reload }
                  : undefined
              }
            />
          ) : deferredSearch || isFiltered ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              description={
                deferredSearch
                  ? 'No broadcasts match your search.'
                  : 'No broadcasts match these filters.'
              }
              action={isFiltered ? { label: 'Clear filters', onPress: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No broadcasts yet"
              description="Messages you write, send or approve will show up here."
              action={
                canDraft
                  ? {
                      label: 'Create broadcast',
                      variant: 'primary',
                      onPress: () => router.push('/broadcasts/new'),
                    }
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          broadcasts.hasNextPage && broadcasts.isFetching ? (
            <View className="py-4">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : undefined
        }
      />
      {collapsing.bar}

      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between gap-3 px-5"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <FilterGroupsButton
          groups={groups}
          onReset={resetFilters}
          title="Filter broadcasts"
          description="Group, order and narrow your messages."
          accessibilityLabel="Open broadcast filters"
        />
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSearching ? 'Hide search' : 'Search broadcasts'}
            accessibilityState={{ selected: isSearching }}
            onPress={() => (isSearching ? closeSearch() : setIsSearching(true))}
            className={cn(
              'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
              isSearching ? 'bg-primary' : 'bg-card',
            )}
          >
            <Search size={21} color={isSearching ? theme.primaryForeground : theme.foreground} />
          </Pressable>
          {canDraft ? (
            <Button
              label="New"
              accessibilityLabel="New broadcast"
              icon={SquarePen}
              variant="accent"
              shape="pill"
              onPress={() => router.push('/broadcasts/new')}
            />
          ) : null}
        </View>
      </View>
    </>
  );
}
