import { router, useFocusEffect } from 'expo-router';
import { CloudOff, SearchX, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import {
  EmptyState,
  FilterGroupsButton,
  IconButton,
  SearchField,
  Skeleton,
  Text,
  type FilterGroup,
} from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasAnyPermission } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';

import { MemberDetailSheet } from '../components/MemberDetailSheet';
import { MemberRow } from '../components/MemberRow';
import { UnitSheet, type UnitChoice } from '../components/UnitPicker';
import { useMemberPages, type MemberListFilters } from '../hooks/use_members';
import type { MemberResponse } from '../types';

type GroupBy = 'letter' | 'unit';
type SortBy = 'first_name' | 'last_name';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'executives' | 'members';

interface MemberSection {
  title: string;
  data: MemberResponse[];
}

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
const NO_UNIT = 'No unit';

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<MemberResponse, MemberSection>,
);

const letterOf = (name: string) => {
  const letter = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
};

// Pages arrive already ordered by the server, so sections are runs of equal titles.
function toSections(items: MemberResponse[], groupBy: GroupBy, sortBy: SortBy) {
  const sections: MemberSection[] = [];
  for (const item of items) {
    const title =
      groupBy === 'unit'
        ? (item.unitName ?? NO_UNIT)
        : letterOf(sortBy === 'last_name' ? item.lastName : item.firstName);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

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
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle('Members', { header: 'tab' });
  // The import screen is also where one member is added by hand, so either permission opens it.
  const canAdd = useHasAnyPermission('member.import', 'member.manage');
  const listRef = useRef<SectionList<MemberResponse, MemberSection>>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('letter');
  const [sortBy, setSortBy] = useState<SortBy>('first_name');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [unit, setUnit] = useState<UnitChoice | null>(null);
  const [isUnitSheetOpen, setIsUnitSheetOpen] = useState(false);
  const query = useDebouncedValue(search.trim());
  const filters: MemberListFilters = {
    sort: sortBy === 'last_name' ? 'last_name' : undefined,
    groupBy: groupBy === 'unit' ? 'unit' : undefined,
    status: status === 'all' ? undefined : status,
    isExecutive: role === 'all' ? undefined : role === 'executives',
    unitId: unit?.id,
  };
  const members = useMemberPages(query, filters);
  const sections = useMemo(
    () => toSections(members.items, groupBy, sortBy),
    [members.items, groupBy, sortBy],
  );
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

  const groups: FilterGroup[] = [
    {
      title: 'Group by',
      options: [
        { key: 'letter', label: 'Name (A–Z)' },
        { key: 'unit', label: 'Unit' },
      ],
      value: groupBy,
      defaultValue: 'letter',
      onChange: (value) => setGroupBy(value as GroupBy),
    },
    {
      title: 'Sort names by',
      options: [
        { key: 'first_name', label: 'First name' },
        { key: 'last_name', label: 'Last name' },
      ],
      value: sortBy,
      defaultValue: 'first_name',
      onChange: (value) => setSortBy(value as SortBy),
    },
    {
      title: 'Show',
      options: [
        { key: 'all', label: 'Everyone' },
        { key: 'executives', label: 'Executives only' },
        { key: 'members', label: 'Not executives' },
      ],
      value: role,
      defaultValue: 'all',
      onChange: (value) => setRole(value as RoleFilter),
    },
    {
      title: 'Status',
      options: [
        { key: 'all', label: 'Any status' },
        { key: 'active', label: 'Active' },
        { key: 'inactive', label: 'Inactive' },
      ],
      value: status,
      defaultValue: 'all',
      onChange: (value) => setStatus(value as StatusFilter),
    },
  ];

  const resetFilters = () => {
    setGroupBy('letter');
    setSortBy('first_name');
    setRole('all');
    setStatus('all');
    setUnit(null);
  };

  // Only reaches the pages already loaded; the list loads more as it scrolls.
  const jumpToLetter = (letter: string) => {
    const sectionIndex = sections.findIndex((section) => section.title === letter);
    if (sectionIndex >= 0) {
      listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 80 });
    }
  };

  return (
    <>
      <AnimatedSectionList
        ref={listRef}
        sections={sections}
        stickySectionHeadersEnabled={false}
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
          paddingBottom: insets.bottom + 84,
        }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            {collapsing.largeTitle}
            <SearchField value={search} onChangeText={setSearch} placeholder="Search members" />
            <View className="flex-row items-center gap-2">
              <Text variant="caption">
                {members.total.toLocaleString()} {members.total === 1 ? 'member' : 'members'}
                {unit ? ` in ${unit.name}` : ''}
              </Text>
              {members.isFetching && members.items.length > 0 ? (
                <ActivityIndicator color={theme.mutedForeground} />
              ) : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            className="bg-background pb-1 pt-5 font-sans-bold text-xs uppercase tracking-widest text-accent-emphasis"
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <Animated.View entering={enterRow(index)}>
            <MemberRow
              member={{
                id: item.id,
                name: item.fullName,
                unit: item.unitName ?? NO_UNIT,
                status: item.status,
              }}
              isLast={index === section.data.length - 1}
              onPress={() => setSelectedId(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          members.isLoading ? (
            <MemberListSkeleton />
          ) : members.error ? (
            <EmptyState
              icon={CloudOff}
              title="Couldn’t load members"
              description={members.error.message}
              action={
                members.error.isRetryable
                  ? { label: 'Try again', onPress: members.reload }
                  : undefined
              }
            />
          ) : query ? (
            <EmptyState
              icon={SearchX}
              title="No members found"
              description="Try a different name, phone number or party ID."
            />
          ) : groups.some((g) => g.value !== g.defaultValue) || unit ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              description="No members match these filters."
              action={{ label: 'Clear filters', onPress: resetFilters }}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Add members one by one or import a spreadsheet."
              action={
                canAdd
                  ? {
                      label: 'Add members',
                      variant: 'primary',
                      onPress: () => router.push('/members/import'),
                    }
                  : undefined
              }
            />
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
      {isUnitSheetOpen ? (
        <UnitSheet
          selectedId={unit?.id}
          noneLabel="All units"
          onSelect={(choice) => {
            setUnit(choice);
            setIsUnitSheetOpen(false);
          }}
          onClose={() => setIsUnitSheetOpen(false)}
        />
      ) : null}

      {groupBy === 'letter' ? (
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
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-5"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <FilterGroupsButton
          groups={groups}
          links={[
            {
              title: 'Unit',
              value: unit?.name ?? 'All units',
              isActive: unit !== null,
              onPress: () => setIsUnitSheetOpen(true),
            },
          ]}
          onReset={resetFilters}
          title="Filter members"
          description="Group, sort and narrow the list."
          accessibilityLabel="Open member filters"
        />
        {canAdd ? (
          <IconButton
            icon={Users}
            label="Import or add members"
            variant="accent"
            size="lg"
            className="h-14 w-14"
            onPress={() => router.push('/members/import')}
          />
        ) : null}
      </View>
    </>
  );
}
