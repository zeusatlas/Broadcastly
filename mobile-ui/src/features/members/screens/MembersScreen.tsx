import { router } from 'expo-router';
import { FileSpreadsheet, Users } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCollapsingTitle } from '@/components/shared';
import { Button, SearchField, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { MemberRow, type MemberRowData } from '../components/MemberRow';
import { MemberDetailSheet } from '../components/MemberDetailSheet';

// TODO(members API): sample rows; becomes a paginated, server-searched query within scope (FR-IAM-03).
const DEMO_MEMBERS: MemberRowData[] = [
  { id: 'member-1', name: 'Ama Mensah', unit: 'Central Branch', status: 'active' },
  { id: 'member-2', name: 'Kwame Owusu', unit: 'North Electoral Area', status: 'active' },
  { id: 'member-3', name: 'Akosua Asante', unit: 'Riverside Branch', status: 'active' },
  { id: 'member-4', name: 'Kofi Boateng', unit: 'East Polling Station', status: 'inactive' },
  { id: 'member-5', name: 'Abena Ofori', unit: 'Central Branch', status: 'active' },
];

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

export function MembersScreen() {
  const theme = useTheme();
  const collapsing = useCollapsingTitle('Members', { header: 'tab' });
  const canImport = useHasPermission('member.import');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberRowData | null>(null);
  const listRef = useRef<Animated.FlatList<MemberRowData>>(null);

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? DEMO_MEMBERS.filter(
          (member) =>
            member.name.toLowerCase().includes(query) || member.unit.toLowerCase().includes(query),
        )
      : DEMO_MEMBERS;
    return [...filtered].sort((left, right) => left.name.localeCompare(right.name));
  }, [search]);

  const jumpToLetter = (letter: string) => {
    const index = items.findIndex((item) =>
      letter === '#' ? !/^[a-z]/i.test(item.name) : item.name.toUpperCase().startsWith(letter),
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
  };

  return (
    <>
      <Animated.FlatList<MemberRowData>
        ref={listRef}
        data={items}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: canImport ? 104 : 24,
        }}
        ListHeaderComponent={
          <View className="pb-2">
            {collapsing.largeTitle}
            <View className="gap-4">
              <SearchField value={search} onChangeText={setSearch} placeholder="Search members" />
              <Text variant="caption">
                {items.length.toLocaleString()} {items.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterRow(index)}>
            <MemberRow
              member={item}
              isLast={index === items.length - 1}
              onPress={() => setSelectedMember(item)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View className="items-center gap-3 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users size={24} color={theme.mutedForeground} />
            </View>
            <Text variant="bodyMuted">No members match.</Text>
          </View>
        }
      />
      {collapsing.bar}

      <MemberDetailSheet member={selectedMember} onClose={() => setSelectedMember(null)} />

      <View pointerEvents="box-none" className="absolute bottom-24 right-1 top-40 justify-center">
        <View className="items-center rounded-full bg-card/80 px-1 py-1">
          {ALPHABET.map((letter) => (
            <Pressable
              key={letter}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${letter === '#' ? 'symbols' : letter}`}
              onPress={() => jumpToLetter(letter)}
              className="h-5 w-6 items-center justify-center"
            >
              <Text className="font-sans-semibold text-[10px] text-primary">{letter}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {canImport ? (
        <View pointerEvents="box-none" className="absolute bottom-5 right-5">
          <Button
            label="Import"
            accessibilityLabel="Import members"
            icon={FileSpreadsheet}
            variant="accent"
            size="lg"
            shape="pill"
            onPress={() => router.push('/members/import')}
          />
        </View>
      ) : null}
    </>
  );
}
