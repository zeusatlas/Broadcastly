import { CheckCheck, ChevronDown, ListFilter, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { NotificationItem } from '../components/NotificationItem';
import type { NotificationItemData } from '../types';

type NotificationFilter = 'all' | 'unread' | 'read';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

// TODO(notifications API): static sample data; becomes a paginated FlatList once FR-NOT-01 is wired.
const GROUPS: { title: string; items: NotificationItemData[] }[] = [
  {
    title: 'Today',
    items: [
      {
        id: '1',
        type: 'approval_request',
        title: 'Approval needed',
        body: 'Membership dues reminder (8,412 recipients) is waiting for your approval.',
        time: '09:12',
        isUnread: true,
      },
      {
        id: '2',
        type: 'broadcast_delivered',
        title: 'Broadcast delivered',
        body: 'Executive meeting — Saturday 9am reached 142 of 146 recipients.',
        time: '08:20',
        isUnread: true,
      },
    ],
  },
  {
    title: 'Earlier',
    items: [
      {
        id: '3',
        type: 'broadcast_partially_failed',
        title: 'Some messages failed',
        body: 'Polling station verification notice: 124 messages could not be delivered.',
        time: 'Yesterday',
        isUnread: false,
      },
      {
        id: '4',
        type: 'import_completed',
        title: 'Member import finished',
        body: '1,204 members imported, 12 rows need attention.',
        time: 'Mon',
        isUnread: false,
      },
      {
        id: '5',
        type: 'approval_decision',
        title: 'Broadcast approved',
        body: 'Youth rally reminder was approved by the Constituency Secretary.',
        time: '28 Oct',
        isUnread: false,
      },
    ],
  },
];

// Opens from the home bell, sliding in from the right.
export function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      filter === 'all' ? true : filter === 'unread' ? item.isUnread : !item.isUnread,
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <PageScreen
      title="Notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read' }}
      footer={<NotificationFilterBar filter={filter} onChange={setFilter} />}
    >
      {groups.map((group, index) => (
        <View key={group.title} className={index === 0 ? undefined : 'mt-6'}>
          <Text
            accessibilityRole="header"
            className="font-sans-bold text-xs uppercase tracking-widest text-muted-foreground"
          >
            {group.title}
          </Text>
          {group.items.map((item, index) => (
            <NotificationItem
              key={item.id}
              notification={item}
              isLast={index === group.items.length - 1}
            />
          ))}
        </View>
      ))}
    </PageScreen>
  );
}

interface NotificationFilterBarProps {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
}

function NotificationFilterBar({ filter, onChange }: NotificationFilterBarProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = FILTERS.find((item) => item.key === filter)?.label ?? 'All';

  return (
    <View className="gap-2">
      {isOpen ? (
        <View className="flex-row items-center gap-1 rounded-full bg-card p-1">
          {FILTERS.map((item) => {
            const isSelected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(item.key);
                  setIsOpen(false);
                }}
                className={cn(
                  'h-11 flex-1 items-center justify-center rounded-full px-3 active:opacity-70',
                  isSelected && 'bg-primary',
                )}
              >
                <Text
                  className={cn(
                    'font-sans-semibold text-sm',
                    isSelected ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <View
          className={cn(
            'flex-row items-center gap-2 rounded-full',
            filter !== 'all' && 'bg-card pr-3',
          )}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notification filters"
            accessibilityState={{ selected: filter !== 'all' }}
            onPress={() => setIsOpen((open) => !open)}
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
              accessibilityLabel={`Current filter: ${selectedLabel}`}
              onPress={() => setIsOpen((open) => !open)}
              className="flex-row items-center gap-1 px-1 active:opacity-70"
            >
              <Text className="font-sans-semibold text-base text-foreground">{selectedLabel}</Text>
              <ChevronDown size={17} color={theme.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search notifications"
          className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
        >
          <Search size={21} color={theme.foreground} />
        </Pressable>
      </View>
    </View>
  );
}
