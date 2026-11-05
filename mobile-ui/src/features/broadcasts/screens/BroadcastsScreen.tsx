import { router, useFocusEffect } from 'expo-router';
import { Inbox, ListFilter, SquarePen, X } from 'lucide-react-native';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import { Chip, IconButton, SearchField, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { BroadcastListSkeleton } from '../components/BroadcastListSkeleton';
import { BroadcastRow } from '../components/BroadcastRow';
import { useReadBroadcastsQuery } from '../hooks/use_broadcasts';
import type { BroadcastStatus, BroadcastSummary, ListBroadcastsParams } from '../types';
import { toBroadcastSummary } from '../utils/broadcast_mapper';

type Filter = 'all' | 'drafts' | 'pending' | 'scheduled' | 'sent' | 'failed';

const FILTERS: { key: Filter; label: string; statuses?: BroadcastStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'drafts', label: 'Drafts', statuses: ['draft'] },
  { key: 'pending', label: 'Pending', statuses: ['pending_approval', 'approved'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { key: 'sent', label: 'Sent', statuses: ['processing', 'submitted', 'completed'] },
  { key: 'failed', label: 'Failed', statuses: ['partially_failed', 'failed', 'cancelled'] },
];

export function BroadcastsScreen() {
  const collapsing = useCollapsingTitle('Broadcasts', { header: 'tab' });
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canDraft = useHasPermission('broadcast.draft');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const hasFocusedOnce = useRef(false);
  const hasMountedOnce = useRef(false);
  const params: ListBroadcastsParams = {
    page: 1,
    pageSize: 20,
    statuses: FILTERS.find((f) => f.key === filter)?.statuses,
    search: deferredSearch.trim() || undefined,
  };
  const broadcasts = useReadBroadcastsQuery(params);
  const refetch = useRef(broadcasts.refetch);
  const items = useMemo<BroadcastSummary[]>(
    () => broadcasts.data?.items.map(toBroadcastSummary) ?? [],
    [broadcasts.data?.items],
  );

  useEffect(() => {
    refetch.current = broadcasts.refetch;
  }, [broadcasts.refetch]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) refetch.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && hasMountedOnce.current) refetch.current();
      hasMountedOnce.current = true;
    });
    return () => subscription.remove();
  }, []);

  return (
    <>
      <Animated.FlatList<BroadcastSummary>
        data={items}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        refreshControl={
          <RefreshControl
            refreshing={broadcasts.isFetching && !broadcasts.isLoading}
            onRefresh={broadcasts.refetch}
          />
        }
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: canDraft ? 104 : 24,
        }}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            {collapsing.largeTitle}
            {broadcasts.error && items.length > 0 ? (
              <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
                <Text variant="caption" className="flex-1">
                  Couldn’t refresh broadcasts.
                </Text>
                {broadcasts.error.isRetryable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry refreshing broadcasts"
                    onPress={broadcasts.refetch}
                    className="min-h-11 justify-center px-2"
                  >
                    <Text className="font-sans-semibold text-primary">Retry</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <View className="flex-row items-center gap-2">
              <Text variant="caption">
                {(broadcasts.data?.total ?? 0).toLocaleString()}{' '}
                {broadcasts.data?.total === 1 ? 'broadcast' : 'broadcasts'}
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
        renderItem={({ item, index }) => (
          <Animated.View entering={enterRow(index)}>
            <BroadcastRow
              broadcast={item}
              isLast={index === items.length - 1}
              onPress={() => router.push({ pathname: '/broadcasts/[id]', params: { id: item.id } })}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          broadcasts.isLoading ? (
            <BroadcastListSkeleton />
          ) : broadcasts.error ? (
            <View className="items-center gap-3 py-16">
              <Text variant="bodyMuted" className="text-center">
                {broadcasts.error.message}
              </Text>
              {broadcasts.error.isRetryable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading broadcasts"
                  onPress={broadcasts.refetch}
                  className="min-h-11 justify-center rounded-lg border border-border px-4"
                >
                  <Text className="font-sans-semibold">Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="items-center gap-3 py-16">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Inbox size={24} color={theme.mutedForeground} />
              </View>
              <Text variant="bodyMuted">
                {search.trim()
                  ? 'No broadcasts match your search.'
                  : filter === 'all'
                    ? 'No broadcasts yet.'
                    : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} broadcasts.`}
              </Text>
              {filter === 'all' && !search.trim() && canDraft ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create your first broadcast"
                  onPress={() => router.push('/broadcasts/new')}
                  className="min-h-11 justify-center rounded-lg bg-primary px-4"
                >
                  <Text className="font-sans-semibold text-primary-foreground">
                    Create broadcast
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />
      {collapsing.bar}

      <View
        pointerEvents="box-none"
        className="absolute bottom-5 right-5 flex-row items-center gap-3"
      >
        <IconButton
          icon={ListFilter}
          label="Open broadcast filters"
          variant="outline"
          size="lg"
          onPress={() => setIsSheetOpen(true)}
        />
        {canDraft ? (
          <IconButton
            icon={SquarePen}
            label="New broadcast"
            variant="accent"
            size="lg"
            onPress={() => router.push('/broadcasts/new')}
          />
        ) : null}
      </View>

      <Modal
        visible={isSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSheetOpen(false)}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close broadcast filters"
            onPress={() => setIsSheetOpen(false)}
            className="flex-1"
          />
          <KeyboardAwareScrollView
            bottomOffset={24}
            mode="layout"
            extraKeyboardSpace={insets.bottom + 16}
            keyboardShouldPersistTaps="handled"
            className="max-h-[80%] rounded-t-3xl bg-background px-5 pt-5"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View className="gap-1">
                <Text variant="heading">Find a broadcast</Text>
                <Text variant="caption">Search or filter your messages.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close broadcast filters"
                onPress={() => setIsSheetOpen(false)}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            <SearchField
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="Search broadcasts"
            />
            {search.trim() || filter !== 'all' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear broadcast search and filters"
                onPress={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="min-h-11 justify-center self-start"
              >
                <Text className="font-sans-semibold text-primary">Clear search and filters</Text>
              </Pressable>
            ) : null}
            <Text variant="overline" className="mt-6">
              Status
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  isSelected={item.key === filter}
                  onPress={() => {
                    setFilter(item.key);
                    setIsSheetOpen(false);
                  }}
                />
              ))}
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </>
  );
}
