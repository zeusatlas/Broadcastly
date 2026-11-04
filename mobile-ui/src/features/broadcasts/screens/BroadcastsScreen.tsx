import { router } from 'expo-router';
import { Inbox, SquarePen } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCollapsingTitle } from '@/components/shared';
import { Button, Chip, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { BroadcastRow } from '../components/BroadcastRow';
import type { BroadcastStatus, BroadcastSummary } from '../types';
import { DEMO_BROADCASTS } from '../demo_data';

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
  const canDraft = useHasPermission('broadcast.draft');
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    return statuses
      ? DEMO_BROADCASTS.filter((broadcast) => statuses.includes(broadcast.status))
      : DEMO_BROADCASTS;
  }, [filter]);

  return (
    <>
      <Animated.FlatList<BroadcastSummary>
        data={items}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
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
          <View>
            {collapsing.largeTitle}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
            >
              {FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  isSelected={f.key === filter}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </ScrollView>
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
          <View className="items-center gap-3 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox size={24} color={theme.mutedForeground} />
            </View>
            <Text variant="bodyMuted">
              {filter === 'all'
                ? 'No broadcasts yet.'
                : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} broadcasts.`}
            </Text>
          </View>
        }
      />
      {collapsing.bar}

      {canDraft ? (
        <View pointerEvents="box-none" className="absolute bottom-5 right-5">
          <Button
            label="Compose"
            accessibilityLabel="New broadcast"
            icon={SquarePen}
            variant="accent"
            size="lg"
            shape="pill"
            onPress={() => router.push('/broadcasts/new')}
          />
        </View>
      ) : null}
    </>
  );
}
