import { router } from 'expo-router';
import { FileSpreadsheet, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCollapsingTitle } from '@/components/shared';
import { Button, SearchField, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { MemberRow, type MemberRowData } from '../components/MemberRow';

// TODO(members API): sample rows; becomes a paginated, server-searched query within scope (FR-IAM-03).
const DEMO_MEMBERS: MemberRowData[] = [
  { id: 'member-1', name: 'Ama Mensah', unit: 'Central Branch', status: 'active' },
  { id: 'member-2', name: 'Kwame Owusu', unit: 'North Electoral Area', status: 'active' },
  { id: 'member-3', name: 'Akosua Asante', unit: 'Riverside Branch', status: 'active' },
  { id: 'member-4', name: 'Kofi Boateng', unit: 'East Polling Station', status: 'inactive' },
  { id: 'member-5', name: 'Abena Ofori', unit: 'Central Branch', status: 'active' },
];

export function MembersScreen() {
  const theme = useTheme();
  const collapsing = useCollapsingTitle('Members', { header: 'tab' });
  const canImport = useHasPermission('member.import');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? DEMO_MEMBERS.filter(
          (member) =>
            member.name.toLowerCase().includes(query) || member.unit.toLowerCase().includes(query),
        )
      : DEMO_MEMBERS;
  }, [search]);

  return (
    <>
      <Animated.FlatList<MemberRowData>
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
              onPress={() => router.push({ pathname: '/members/[id]', params: { id: item.id } })}
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
