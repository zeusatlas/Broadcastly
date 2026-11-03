import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { cn } from '@/utils/helpers';

import { GLASS_BUTTON_SIZE } from './HeaderButton';

// Scroll distance over which the big title hands over to the centred one in the bar. The big title
// ends 16pt (pb-4) above the content; a screen's first block adds no top margin of its own.
const HANDOFF = 44;

// The one source of page-title behaviour (Settings mockups): a big left title scrolls away while the
// native header's centred title fades in. Use with an Animated scroll view; `largeTitle` goes first.
// 'native': under a native header. 'tab': no bar, title under the status bar. 'buttons': no bar, title
// under PageScreen's floating glass back/action row.
export type TitleHeader = 'native' | 'tab' | 'buttons';

export function useCollapsingTitle(title?: string, { header = 'native' as TitleHeader } = {}) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setViewportHeight(event.nativeEvent.layout.height),
    [],
  );
  const largeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HANDOFF], [1, 0], Extrapolation.CLAMP),
  }));
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HANDOFF * 0.6, HANDOFF], [0, 1], Extrapolation.CLAMP),
  }));

  const titleTop = {
    native: 0,
    tab: insets.top + 12,
    buttons: insets.top + 4 + GLASS_BUTTON_SIZE + 8,
  }[header];

  if (!title) {
    return {
      onScroll,
      onLayout,
      minHeight: undefined,
      largeTitle: null,
      headerTitle: undefined,
      bar: null,
    };
  }

  return {
    onScroll,
    onLayout,
    // Short pages still scroll far enough to tuck the big title under the bar and stay there.
    minHeight: viewportHeight > 0 ? viewportHeight + HANDOFF * 2 : undefined,
    largeTitle: (
      <Animated.View style={[largeStyle, { paddingTop: titleTop }]}>
        <Text
          accessibilityRole="header"
          className="pb-4 font-sans-extrabold text-4xl leading-tight text-foreground"
        >
          {title}
        </Text>
      </Animated.View>
    ),
    headerTitle: () => (
      <Animated.View style={compactStyle}>
        <Text numberOfLines={1} className="font-sans-bold text-[17px] text-foreground">
          {title}
        </Text>
      </Animated.View>
    ),
    // The native bar is too tall for the owner, so headerless pages get this solid status strip and a
    // compact bar that fades in on scroll. Render it after the scroll view, under any floating buttons.
    bar:
      header === 'native' ? null : (
        <View pointerEvents="none" className="absolute left-0 right-0 top-0">
          <View className="bg-background" style={{ height: insets.top }} />
          <Animated.View
            className={cn(
              'items-center justify-center bg-background',
              header === 'buttons' && 'px-16',
            )}
            style={[compactStyle, { height: header === 'buttons' ? GLASS_BUTTON_SIZE + 8 : 44 }]}
          >
            <Text numberOfLines={1} className="font-sans-bold text-[17px] text-foreground">
              {title}
            </Text>
          </Animated.View>
        </View>
      ),
  };
}
