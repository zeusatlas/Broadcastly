import { router, Stack } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use_theme';
import type { ListSection } from '@/utils/helpers';

import { useCollapsingTitle } from './CollapsingTitle';
import { GLASS_BUTTON_SIZE, GlassHeaderButton, type HeaderButtonProps } from './HeaderButton';

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<unknown, ListSection<unknown>>,
);
const FOOTER_CLEARANCE = 84;

interface RowInfo<T> {
  index: number;
  isLast: boolean;
  section: ListSection<T>;
}

export interface SectionListPageProps<T> {
  title?: string;
  isTabRoot?: boolean;
  headerRight?: HeaderButtonProps;
  backIcon?: LucideIcon;
  backLabel?: string;
  sections: ListSection<T>[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, info: RowInfo<T>) => ReactElement;
  // Content between the title and the first section: intro text, a search box, a count.
  header?: ReactNode;
  empty?: ReactNode;
  // Bottom-pinned bar (filter, search, primary action), floating above the list.
  footer?: ReactNode;
  listFooter?: ReactNode;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showsCounts?: boolean;
}

// PageScreen's chrome (collapsing title, glass buttons, bottom bar) around a virtualised SectionList,
// for every list that can grow large. Rows render as they scroll into view, never all at once.
export function SectionListPage<T>({
  title,
  isTabRoot = false,
  headerRight,
  backIcon = ChevronLeft,
  backLabel = 'Go back',
  sections,
  keyExtractor,
  renderItem,
  header,
  empty,
  footer,
  listFooter,
  onEndReached,
  isLoadingMore = false,
  isRefreshing,
  onRefresh,
  showsCounts = true,
}: SectionListPageProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle(title, { header: isTabRoot ? 'tab' : 'buttons' });
  const untitledTop = isTabRoot ? insets.top + 12 : insets.top + GLASS_BUTTON_SIZE + 16;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: title ?? '' }} />
      <AnimatedSectionList
        sections={sections as ListSection<unknown>[]}
        stickySectionHeadersEnabled={false}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => keyExtractor(item as T)}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing ?? false} onRefresh={onRefresh} />
          ) : undefined
        }
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingTop: title ? 0 : untitledTop,
          paddingBottom: insets.bottom + (footer ? FOOTER_CLEARANCE : 24),
        }}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            {collapsing.largeTitle}
            {header}
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
            {showsCounts ? <Text variant="caption">{section.data.length}</Text> : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Animated.View entering={enterRow(index)}>
            {renderItem(item as T, {
              index,
              isLast: index === section.data.length - 1,
              section: section as ListSection<T>,
            })}
          </Animated.View>
        )}
        ListEmptyComponent={empty ? <>{empty}</> : undefined}
        ListFooterComponent={
          <>
            {isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator color={theme.mutedForeground} />
              </View>
            ) : null}
            {listFooter}
          </>
        }
      />
      {collapsing.bar}

      {isTabRoot ? null : (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 4 }}
        >
          <GlassHeaderButton icon={backIcon} label={backLabel} onPress={() => router.back()} />
          {headerRight ? <GlassHeaderButton {...headerRight} /> : null}
        </View>
      )}

      {footer ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 px-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {footer}
        </View>
      ) : null}
    </>
  );
}
