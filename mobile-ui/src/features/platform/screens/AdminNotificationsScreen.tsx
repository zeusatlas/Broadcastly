import { router, type Href } from 'expo-router';
import {
  BellOff,
  Building2,
  Building,
  CheckCheck,
  CircleX,
  CloudOff,
  Coins,
  CreditCard,
  Search,
  SearchX,
  ShieldAlert,
  UserCog,
  UserRoundCheck,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import {
  EmptyState,
  FILTER_THRESHOLD,
  FilterButton,
  LoadingState,
  SearchField,
} from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { NotificationItem, type NotificationTone } from '@/features/notifications';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn, dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import {
  useMarkAllPlatformNotificationsReadMutation,
  useMarkPlatformNotificationReadMutation,
  usePlatformNotificationPages,
} from '../hooks/use_platform_api';
import type { PlatformNotificationResponse, PlatformNotificationType } from '../types';

type Filter = 'all' | 'unread' | 'read';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all: 'No notifications yet.',
  unread: 'You are all caught up.',
  read: 'No read notifications.',
};

const STYLE: Record<PlatformNotificationType, { icon: LucideIcon; tone: NotificationTone }> = {
  purchase: { icon: CreditCard, tone: 'success' },
  purchase_failed: { icon: CircleX, tone: 'destructive' },
  credits: { icon: Coins, tone: 'primary' },
  organisation: { icon: Building2, tone: 'primary' },
  organisation_suspended: { icon: Building, tone: 'warning' },
  head: { icon: UserRoundCheck, tone: 'accent' },
  admin: { icon: UserCog, tone: 'primary' },
  security: { icon: ShieldAlert, tone: 'destructive' },
};

// What the platform admin hears about: payments, new organisations and heads, admin changes and
// security events, each only with the matching permission. Never their own actions.
export function AdminNotificationsScreen() {
  const theme = useTheme();
  const canViewAudit = useHasPermission('platform.audit.view');
  const canViewFinance = useHasPermission('platform.finance.view');
  const [filter, setFilter] = useState<Filter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = usePlatformNotificationPages(filter, query);
  const markRead = useMarkPlatformNotificationReadMutation();
  const markAll = useMarkAllPlatformNotificationsReadMutation();
  const showsSearch = isSearching || pages.total > FILTER_THRESHOLD;

  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

  const destinationOf = (item: PlatformNotificationResponse): Href | null => {
    if (item.type === 'security') return canViewAudit ? '/admin/audit' : null;
    if (item.type === 'admin') return '/admin/admins';
    if ((item.type === 'purchase' || item.type === 'purchase_failed') && canViewFinance) {
      return '/admin/payments';
    }
    if (item.organisationId) {
      return { pathname: '/admin/organisations/[id]', params: { id: item.organisationId } };
    }
    return null;
  };

  const open = async (item: PlatformNotificationResponse) => {
    if (!item.isRead) {
      const response = await markRead.mutate({ notificationId: item.id });
      if (response) pages.reload();
    }
    const destination = destinationOf(item);
    if (destination) router.push(destination);
  };

  const markAllRead = async () => {
    const response = await markAll.mutate(undefined);
    if (!response) {
      notify.error('Could not mark them as read', 'Check your connection and try again.');
      return;
    }
    notify.success('All caught up', 'Every notification is marked as read.');
    pages.reload();
  };

  const closeSearch = () => {
    setSearch('');
    setIsSearching(false);
  };

  return (
    <SectionListPage
      title="Notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read', onPress: markAllRead }}
      sections={sections}
      showsCounts={false}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <NotificationItem
          notification={item}
          icon={STYLE[item.type]?.icon}
          tone={STYLE[item.type]?.tone}
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
                placeholder="Search by organisation or person"
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
          <LoadingState label="Loading notifications" />
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
                : 'Payments, new organisations and heads, and account alerts will appear here.'
            }
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
