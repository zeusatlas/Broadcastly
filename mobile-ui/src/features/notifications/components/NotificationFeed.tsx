import { router, type Href } from 'expo-router';
import {
  BellOff,
  CheckCheck,
  CloudOff,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { EmptyState, FILTER_THRESHOLD, FilterButton, SearchField, Skeleton } from '@/components/ui';
import { useDebouncedValue, type usePages } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn, dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import type { NotificationFilter } from '../types';

import { NotificationItem, type NotificationTone } from './NotificationItem';

export interface FeedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

type Pages<T extends FeedNotification> = ReturnType<typeof usePages<T>>;

export interface NotificationFeedProps<T extends FeedNotification> {
  usePagesFor: (filter: NotificationFilter, search: string) => Pages<T>;
  markRead: (item: T) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  destinationOf: (item: T) => Href | null;
  styleOf?: (item: T) => { icon: LucideIcon; tone: NotificationTone } | undefined;
  emptyDescription: string;
  searchPlaceholder?: string;
}

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

// The one notifications screen: the organisation's and the platform admin's differ only in data.
export function NotificationFeed<T extends FeedNotification>({
  usePagesFor,
  markRead,
  markAllRead,
  destinationOf,
  styleOf,
  emptyDescription,
  searchPlaceholder = 'Search notifications',
}: NotificationFeedProps<T>) {
  const theme = useTheme();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = usePagesFor(filter, query);
  const showsSearch = isSearching || pages.total > FILTER_THRESHOLD;

  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

  const open = async (item: T) => {
    if (!item.isRead && (await markRead(item))) pages.reload();
    const destination = destinationOf(item);
    if (destination) router.push(destination);
  };

  const readAll = async () => {
    if (await markAllRead()) {
      notify.success('All caught up', 'Every notification is marked as read.');
      pages.reload();
    } else {
      notify.error('Could not mark them as read', 'Check your connection and try again.');
    }
  };

  const closeSearch = () => {
    setSearch('');
    setIsSearching(false);
  };

  return (
    <SectionListPage
      title="Notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read', onPress: readAll }}
      sections={sections}
      showsCounts={false}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <NotificationItem
          notification={item}
          icon={styleOf?.(item)?.icon}
          tone={styleOf?.(item)?.tone}
          isLast={isLast}
          onPress={() => open(item)}
        />
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
                placeholder={searchPlaceholder}
                autoFocus
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close search"
              onPress={closeSearch}
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
            description={query ? 'No notifications match your search.' : emptyDescription}
          />
        )
      }
      footer={
        <View className="flex-row items-center justify-between gap-3">
          <FilterButton
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            defaultValue="all"
            title="Filter notifications"
            description="Show all, unread or read notifications."
            accessibilityLabel="Open notification filters"
            total={pages.total}
          />
          {showsSearch ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSearching ? 'Hide search' : 'Search notifications'}
              accessibilityState={{ selected: isSearching }}
              onPress={() => (isSearching ? closeSearch() : setIsSearching(true))}
              className={cn(
                'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
                isSearching ? 'bg-primary' : 'bg-card',
              )}
            >
              <Search size={21} color={isSearching ? theme.primaryForeground : theme.foreground} />
            </Pressable>
          ) : null}
        </View>
      }
    />
  );
}
