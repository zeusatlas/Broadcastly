import { router } from 'expo-router';
import { Inbox, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { BroadcastRow } from '../components/BroadcastRow';
import type { BroadcastStatus, BroadcastSummary } from '../types';

type Filter = 'all' | 'drafts' | 'pending' | 'scheduled' | 'sent' | 'failed';

const FILTERS: { key: Filter; label: string; statuses?: BroadcastStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'drafts', label: 'Drafts', statuses: ['draft'] },
  { key: 'pending', label: 'Pending', statuses: ['pending_approval', 'approved'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { key: 'sent', label: 'Sent', statuses: ['processing', 'submitted', 'completed'] },
  { key: 'failed', label: 'Failed', statuses: ['partially_failed', 'failed', 'cancelled'] },
];

// TODO(broadcasts API): sample data; becomes a paginated query filtered on the server.
const BROADCASTS: BroadcastSummary[] = [
  {
    id: '1',
    title: 'Executive meeting — Saturday 9am',
    audience: 'Constituency executives',
    sentAt: '08:14',
    status: 'completed',
    delivered: 142,
    recipients: 146,
  },
  {
    id: '2',
    title: 'Membership dues reminder',
    audience: 'All members',
    sentAt: 'Today',
    status: 'pending_approval',
    delivered: 0,
    recipients: 8412,
  },
  {
    id: '3',
    title: 'Youth rally — venue update',
    audience: '3 electoral areas',
    sentAt: 'Fri 10:00',
    status: 'scheduled',
    delivered: 0,
    recipients: 2310,
  },
  {
    id: '4',
    title: 'Polling station verification notice',
    audience: '4 branches',
    sentAt: 'Yesterday',
    status: 'partially_failed',
    delivered: 1890,
    recipients: 2014,
  },
  {
    id: '5',
    title: 'Condolence message',
    audience: 'Branch executives',
    sentAt: 'Mon',
    status: 'draft',
    delivered: 0,
    recipients: 64,
  },
];

export function BroadcastsScreen() {
  const theme = useTheme();
  const canDraft = useHasPermission('broadcast.draft');
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    return statuses ? BROADCASTS.filter((b) => statuses.includes(b.status)) : BROADCASTS;
  }, [filter]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        ListHeaderComponent={
          <View className="gap-4 pb-2 pt-4">
            <View className="gap-1">
              <Text
                accessibilityRole="header"
                className="font-sans-extrabold text-4xl leading-tight text-foreground"
              >
                Broadcasts
              </Text>
              <Text variant="bodyMuted">Drafts, approvals and everything you’ve sent.</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
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
          <BroadcastRow
            broadcast={item}
            isLast={index === items.length - 1}
            onPress={() => router.push({ pathname: '/broadcasts/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View className="items-center gap-3 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Inbox size={24} color={theme.mutedForeground} />
            </View>
            <Text variant="bodyMuted">Nothing here yet.</Text>
          </View>
        }
      />

      {canDraft ? (
        <View pointerEvents="box-none" className="absolute bottom-5 right-5">
          <Button
            label="New broadcast"
            icon={Plus}
            variant="accent"
            size="lg"
            onPress={() => router.push('/broadcasts/new')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
