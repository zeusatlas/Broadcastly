import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, FileSpreadsheet, Upload } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { Button, QueryState, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn, dateSectionTitle, groupIntoSections } from '@/utils/helpers';

import { useImportPages } from '../hooks/use_members';
import type { MemberImportResponse, MemberImportStatus } from '../types';

const STATUS: Record<MemberImportStatus, { label: string; className: string }> = {
  processing: { label: 'Checking', className: 'text-muted-foreground' },
  ready: { label: 'Waiting for review', className: 'text-warning' },
  confirming: { label: 'Saving', className: 'text-muted-foreground' },
  completed: { label: 'Completed', className: 'text-success' },
  failed: { label: 'Failed', className: 'text-destructive' },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground' },
};

function summaryOf(item: MemberImportResponse) {
  const { counts } = item;
  if (item.status === 'completed') {
    return `${counts.created.toLocaleString()} created · ${counts.updated} updated · ${counts.rejected} rejected`;
  }
  if (item.status === 'ready') {
    return `${counts.valid.toLocaleString()} valid · ${counts.invalid} problems · ${counts.duplicates} duplicates`;
  }
  return `${counts.total.toLocaleString()} rows`;
}

function ImportRow({
  item,
  isLast,
  onPress,
}: {
  item: MemberImportResponse;
  isLast: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const status = STATUS[item.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open import ${item.fileName}, ${status.label}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
        <FileSpreadsheet size={20} color={theme.mutedForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {[item.defaultUnitName, item.uploadedBy, new Date(item.createdAt).toLocaleString()]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text className={cn('font-sans-semibold text-xs', status.className)}>{status.label}</Text>
        <Text variant="caption">{summaryOf(item)}</Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}

export function ImportHistoryScreen() {
  const pages = useImportPages();
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );
  const firstFocus = useRef(true);
  const reload = useRef(pages.reload);
  useEffect(() => {
    reload.current = pages.reload;
  });

  // Statuses move on while the import screen is open, so re-read on return.
  useFocusEffect(
    useCallback(() => {
      if (!firstFocus.current) reload.current();
      firstFocus.current = false;
    }, []),
  );

  return (
    <SectionListPage
      title="Import activity"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <ImportRow
          item={item}
          isLast={isLast}
          onPress={() => router.push({ pathname: '/members/import', params: { id: item.id } })}
        />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      header={<Text variant="bodyMuted">What was imported, who imported it, and how it went.</Text>}
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText="No imports yet."
          onRetry={pages.reload}
        />
      }
      footer={
        <Button
          label="New import"
          icon={Upload}
          variant="accent"
          shape="pill"
          fullWidth
          onPress={() => router.push('/members/import')}
        />
      }
    />
  );
}
