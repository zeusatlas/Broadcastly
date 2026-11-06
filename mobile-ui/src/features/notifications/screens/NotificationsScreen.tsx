import { router, type Href } from 'expo-router';
import { BellOff, CheckCheck, CloudOff, Search, SearchX, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { EmptyState, FILTER_THRESHOLD, FilterButton, SearchField, Skeleton } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn, dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import { NotificationItem } from '../components/NotificationItem';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationPages,
} from '../hooks/use_notifications';
import type { NotificationFilter, NotificationResponse } from '../types';

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

  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

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
    <SectionListPage
      title="Notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read', onPress: markAllRead }}
      sections={sections}
      showsCounts={false}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <NotificationItem notification={item} isLast={isLast} onPress={() => open(item)} />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      header={
        isSearching ? (
          <View className="flex-row items-center gap-2">
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
        ) : null
      }
      empty={
        pages.isLoading ? (
          <NotificationSkeleton />
        ) : pages.error ? (
          <EmptyState
            icon={CloudOff}
            title="Couldn’t load notifications"
            description={pages.error.message}
            action={
              pages.error.isRetryable ? { label: 'Try again', onPress: pages.reload } : undefined
            }
          />
        ) : (
          <EmptyState
            icon={query ? SearchX : BellOff}
            title={query ? 'Nothing matches' : EMPTY_TEXT[filter]}
            description={
              query
                ? 'No notifications match your search.'
                : 'Approvals, imports and delivery updates will appear here.'
            }
          />
        )
      }
      footer={
        <NotificationFilterBar
          filter={filter}
          onChange={setFilter}
          onSearch={() => {
            if (isSearching) setSearch('');
            setIsSearching((current) => !current);
          }}
          isSearching={isSearching}
          total={pages.total}
        />
      }
    />
  );
}

interface NotificationFilterBarProps {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
  onSearch: () => void;
  isSearching: boolean;
  total: number;
}

function NotificationFilterBar({
  filter,
  onChange,
  onSearch,
  isSearching,
  total,
}: NotificationFilterBarProps) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center justify-between gap-3">
      <FilterButton
        options={FILTERS}
        value={filter}
        onChange={onChange}
        defaultValue="all"
        title="Filter notifications"
        description="Show all, unread or read notifications."
        accessibilityLabel="Open notification filters"
        total={total}
      />
      {isSearching || total > FILTER_THRESHOLD ? (
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
      ) : null}
    </View>
  );
}
