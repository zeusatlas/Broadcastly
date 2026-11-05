import { router, type Href } from 'expo-router';
import { BellOff, CheckCheck, ChevronDown, ListFilter, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, SearchField, Skeleton, Text } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import { NotificationItem } from '../components/NotificationItem';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationPages,
} from '../hooks/use_notifications';
import type { NotificationFilter, NotificationResponse } from '../types';
import { isToday } from '../utils/notification_time';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const EMPTY_TEXT: Record<NotificationFilter, string> = {
  all: 'No notifications yet.',
  unread: 'You are all caught up.',
  read: 'No read notifications.',
};

// Where a notification leads: the approval queue, the import history, or the broadcast itself.
function destinationOf(notification: NotificationResponse): Href | null {
  if (notification.type === 'approval_request') return '/approvals';
  if (notification.type === 'import_completed') return '/members/imports';
  if (notification.broadcastId) {
    return { pathname: '/broadcasts/[id]', params: { id: notification.broadcastId } };
  }
  return null;
}

function NotificationSkeleton() {
  return (
    <View accessibilityLabel="Loading notifications">
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} className="flex-row gap-3 border-b border-border py-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}

// Opens from the home bell, sliding in from the right.
export function NotificationsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = useNotificationPages(filter, query);
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  const groups = [
    { title: 'Today', items: pages.items.filter((item) => isToday(item.createdAt)) },
    { title: 'Earlier', items: pages.items.filter((item) => !isToday(item.createdAt)) },
  ].filter((group) => group.items.length > 0);

  const open = async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      const response = await markRead.mutate({ notificationId: notification.id });
      if (response) pages.reload();
    }
    const destination = destinationOf(notification);
    if (destination) router.push(destination);
  };

  const markAllRead = async () => {
    const response = await markAll.mutate(undefined);
    if (response) {
      notify.success('All caught up', 'Every notification is marked as read.');
      pages.reload();
    } else {
      notify.error('Could not mark them as read', 'Check your connection and try again.');
    }
  };

  return (
    <PageScreen
      title="Notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read', onPress: markAllRead }}
      footer={
        <NotificationFilterBar
          filter={filter}
          onChange={setFilter}
          onSearch={() => {
            if (isSearching) setSearch('');
            setIsSearching((current) => !current);
          }}
          isSearching={isSearching}
        />
      }
    >
      {isSearching ? (
        <View className="mb-4 flex-row items-center gap-2">
          <View className="flex-1">
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search notifications"
              autoFocus
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={() => {
              setSearch('');
              setIsSearching(false);
            }}
            className="h-12 w-12 items-center justify-center rounded-full bg-card active:opacity-70"
          >
            <X size={20} color={theme.foreground} />
          </Pressable>
        </View>
      ) : null}
      {pages.isLoading ? (
        <NotificationSkeleton />
      ) : pages.error && pages.items.length === 0 ? (
        <View className="items-center gap-3 py-16">
          <Text variant="bodyMuted" className="text-center">
            {pages.error.message}
          </Text>
          {pages.error.isRetryable ? (
            <Button label="Try again" variant="outline" onPress={pages.reload} />
          ) : null}
        </View>
      ) : groups.length === 0 ? (
        <View className="items-center gap-3 py-16">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BellOff size={24} color={theme.mutedForeground} />
          </View>
          <Text variant="bodyMuted">
            {query ? 'No notifications match your search.' : EMPTY_TEXT[filter]}
          </Text>
        </View>
      ) : (
        groups.map((group, groupIndex) => (
          <View key={group.title} className={groupIndex === 0 ? undefined : 'mt-6'}>
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
                onPress={() => open(item)}
              />
            ))}
          </View>
        ))
      )}
      {pages.hasNextPage ? (
        <Button
          label="Show older"
          variant="outline"
          className="mt-4"
          isLoading={pages.isFetching}
          loadingLabel="Loading…"
          onPress={pages.loadMore}
        />
      ) : null}
    </PageScreen>
  );
}

interface NotificationFilterBarProps {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
  onSearch: () => void;
  isSearching: boolean;
}

function NotificationFilterBar({
  filter,
  onChange,
  onSearch,
  isSearching,
}: NotificationFilterBarProps) {
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
                accessibilityLabel={`Show ${item.label.toLowerCase()} notifications`}
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
            onPress={() => setIsOpen((current) => !current)}
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
              onPress={() => setIsOpen((current) => !current)}
              className="flex-row items-center gap-1 px-1 active:opacity-70"
            >
              <Text className="font-sans-semibold text-base text-foreground">{selectedLabel}</Text>
              <ChevronDown size={17} color={theme.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSearching ? 'Hide search' : 'Search notifications'}
          accessibilityState={{ selected: isSearching }}
          onPress={onSearch}
          className={cn(
            'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
            isSearching ? 'bg-primary' : 'bg-card',
          )}
        >
          <Search size={21} color={isSearching ? theme.primaryForeground : theme.foreground} />
        </Pressable>
      </View>
    </View>
  );
}
