import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { useCollapsingTitle } from '@/components/shared';
import { QueryState, Skeleton, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use_theme';
import { dateSectionTitle, groupIntoSections, type ListSection } from '@/utils/helpers';

import { useTemplatePages } from '../hooks/use_templates';
import { TemplatePreviewSheet } from '../screens/TemplatePreviewSheet';
import type { ListTemplatesParams, TemplateResponse } from '../types';
import { TemplateRow } from './TemplateRow';

type Collapsing = ReturnType<typeof useCollapsingTitle>;

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<TemplateResponse, ListSection<TemplateResponse>>,
);

interface TemplateListProps {
  filters: Omit<ListTemplatesParams, 'page' | 'pageSize'>;
  header: ReactNode;
  emptyText: string;
  collapsing?: Pick<Collapsing, 'onScroll' | 'onLayout' | 'minHeight'>;
  paddingTop?: number;
  paddingBottom: number;
  onTotalChange?: (total: number) => void;
}

function TemplateListSkeleton() {
  return (
    <View accessibilityLabel="Loading templates" className="gap-5 py-4">
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3 border-b border-border pb-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function TemplateList({
  filters,
  header,
  emptyText,
  collapsing,
  paddingTop = 0,
  paddingBottom,
  onTotalChange,
}: TemplateListProps) {
  const theme = useTheme();
  const templates = useTemplatePages(filters);
  useEffect(() => {
    onTotalChange?.(templates.total);
  }, [onTotalChange, templates.total]);
  const [selected, setSelected] = useState<TemplateResponse | null>(null);
  const reload = useRef(templates.reload);
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = templates.reload;
  });

  // Coming back from the new or edit screen shows the saved change.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  const { items } = templates;
  // The API returns the most recently updated first, so sections follow that order.
  const sections = useMemo(
    () => groupIntoSections(items, (item) => dateSectionTitle(item.updatedAt)),
    [items],
  );

  return (
    <>
      <AnimatedSectionList
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        onScroll={collapsing?.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing?.onLayout}
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-background"
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing?.minHeight,
          paddingHorizontal: 20,
          paddingTop,
          paddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={templates.isFetching && !templates.isLoading && items.length > 0}
            onRefresh={templates.reload}
          />
        }
        onEndReached={templates.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            {header}
            {templates.error && items.length > 0 ? (
              <Text variant="caption" className="text-destructive">
                {templates.error.message}
              </Text>
            ) : null}
            {items.length > 0 ? (
              <Text variant="caption">
                {templates.total.toLocaleString()}{' '}
                {templates.total === 1 ? 'template' : 'templates'}
              </Text>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-baseline justify-between bg-background pb-1 pt-5">
            <Text
              accessibilityRole="header"
              className="font-sans-bold text-xs uppercase tracking-widest text-accent-emphasis"
            >
              {section.title}
            </Text>
            <Text variant="caption">{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Animated.View entering={enterRow(index)}>
            <TemplateRow
              template={item}
              isLast={index === section.data.length - 1}
              onPress={() => setSelected(item)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          templates.isLoading ? (
            <TemplateListSkeleton />
          ) : (
            <QueryState
              isLoading={false}
              error={templates.error}
              isEmpty
              emptyText={emptyText}
              onRetry={templates.reload}
            />
          )
        }
        ListFooterComponent={
          templates.hasNextPage && templates.isFetching ? (
            <View className="items-center py-4">
              <ActivityIndicator
                accessibilityLabel="Loading more templates"
                color={theme.mutedForeground}
              />
            </View>
          ) : undefined
        }
      />
      <TemplatePreviewSheet template={selected} onClose={() => setSelected(null)} />
    </>
  );
}
