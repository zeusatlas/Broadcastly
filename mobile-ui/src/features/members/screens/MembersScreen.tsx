import { router, useFocusEffect } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCollapsingTitle } from '@/components/shared';
import { Button, IconButton, SearchField, Skeleton, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasAnyPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { MemberDetailSheet } from '../components/MemberDetailSheet';
import { MemberRow } from '../components/MemberRow';
import { useMemberPages } from '../hooks/use_members';
import { useDebouncedValue } from '@/hooks/use_pages';
import type { MemberResponse } from '../types';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

function MemberListSkeleton() {
  return (
    <View accessibilityLabel="Loading members" className="gap-4 py-4">
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3 border-b border-border py-3.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MembersScreen() {
  const theme = useTheme();
  const collapsing = useCollapsingTitle('Members', { header: 'tab' });
  // The import screen is also where one member is added by hand, so either permission opens it.
  const canAdd = useHasAnyPermission('member.import', 'member.manage');
  const listRef = useRef<Animated.FlatList<MemberResponse>>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim());
  const members = useMemberPages(query);
  const firstFocus = useRef(true);
  const reload = useRef(members.reload);
  useEffect(() => {
    reload.current = members.reload;
  });

  useFocusEffect(
    useCallback(() => {
      if (!firstFocus.current) reload.current();
      firstFocus.current = false;
    }, []),
  );

  // Members arrive sorted A–Z by name; the jump only reaches the pages already loaded.
  const jumpToLetter = (letter: string) => {
    const index = members.items.findIndex((item) =>
      letter === '#'
        ? !/^[a-z]/i.test(item.fullName)
        : item.fullName.toUpperCase().startsWith(letter),
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
  };

  return (
    <>
      <Animated.FlatList<MemberResponse>
        ref={listRef}
        data={members.items}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        onScrollToIndexFailed={() => undefined}
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={members.isFetching && !members.isLoading}
            onRefresh={members.reload}
          />
        }
        keyExtractor={(item) => item.id}
        onEndReached={members.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: canAdd ? 104 : 24,
        }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            {collapsing.largeTitle}
            <SearchField value={search} onChangeText={setSearch} placeholder="Search members" />
            <View className="flex-row items-center gap-2">
              <Text variant="caption">
                {members.total.toLocaleString()} {members.total === 1 ? 'member' : 'members'}
              </Text>
              {members.isFetching && members.items.length > 0 ? (
                <ActivityIndicator color={theme.mutedForeground} />
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterRow(index)}>
            <MemberRow
              member={{
                id: item.id,
                name: item.fullName,
                unit: item.unitName ?? 'No unit',
                status: item.status,
              }}
              isLast={index === members.items.length - 1}
              onPress={() => setSelectedId(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          members.isLoading ? (
            <MemberListSkeleton />
          ) : members.error ? (
            <View className="items-center gap-3 py-16">
              <Text variant="bodyMuted" className="text-center">
                {members.error.message}
              </Text>
              {members.error.isRetryable ? (
                <Button label="Try again" variant="outline" onPress={members.reload} />
              ) : null}
            </View>
          ) : (
            <View className="items-center gap-3 py-16">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users size={24} color={theme.mutedForeground} />
              </View>
              <Text variant="bodyMuted">
                {query ? 'No members match your search.' : 'No members have been added yet.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          members.hasNextPage && members.isFetching ? (
            <View className="py-4">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : undefined
        }
      />
      {collapsing.bar}
      <MemberDetailSheet
        memberId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={members.reload}
      />

      <View
        pointerEvents="box-none"
        // Explicit top/bottom so the strip spans the whole screen and its letters sit in the middle.
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 4,
          zIndex: 10,
          justifyContent: 'center',
        }}
      >
        <View className="items-center">
          {ALPHABET.map((letter) => (
            <Pressable
              key={letter}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${letter === '#' ? 'symbols' : letter}`}
              onPress={() => jumpToLetter(letter)}
              className="h-4 w-4 items-center justify-center"
            >
              <Text className="font-sans-bold text-[10px] text-accent-emphasis">{letter}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {canAdd ? (
        <View pointerEvents="box-none" className="absolute bottom-5 right-5">
          <IconButton
            icon={Users}
            label="Import or add members"
            variant="accent"
            size="lg"
            className="h-14 w-14"
            onPress={() => router.push('/members/import')}
          />
        </View>
      ) : null}
    </>
  );
}
