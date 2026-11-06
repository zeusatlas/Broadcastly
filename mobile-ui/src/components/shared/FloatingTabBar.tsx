import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors, Fonts } from '@/constants/theme';
import { useThemeName } from '@/hooks/use_theme';
import { haptics } from '@/utils/haptics';
import { cn } from '@/utils/helpers';

export interface FloatingTab {
  name: string;
  title: string;
  md: ComponentProps<typeof MaterialIcons>['name'];
}

interface FloatingTabBarProps extends BottomTabBarProps {
  tabs: FloatingTab[];
}

const BAR_HEIGHT = 70;
const BAR_PADDING = 5;
const PILL = 999;
// Wide phones and tablets keep the same bar and highlight a small phone gets, centred.
const MAX_BAR_WIDTH = 520;
const MAX_INDICATOR_WIDTH = 96;

// Android's answer to the iOS 26 tab bar: a floating glass pill as wide as the screen, with one filled
// highlight that springs to the selected tab, stretching as it travels, then settling.
export function FloatingTabBar({
  state,
  emitter,
  navigateToTab,
  insets,
  tabs,
}: FloatingTabBarProps) {
  const themeName = useThemeName();
  const palette = Colors[themeName];
  const [width, setWidth] = useState(0);
  const tabWidth = state.routes.length > 0 ? width / state.routes.length : 0;
  const indicatorWidth = Math.min(tabWidth, MAX_INDICATOR_WIDTH);
  const offset = useSharedValue(0);
  const stretch = useSharedValue(1);
  // Navy on light, gold on dark: each clears 4.5:1 against the highlight.
  const activeColor = themeName === 'light' ? palette.primary : palette.accentEmphasis;

  useEffect(() => {
    if (tabWidth === 0) return;
    offset.value = withSpring(state.index * tabWidth, { damping: 17, stiffness: 170, mass: 0.9 });
    stretch.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withSpring(1, { damping: 11, stiffness: 160 }),
    );
  }, [offset, stretch, state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }, { scaleX: stretch.value }],
  }));

  return (
    <View
      style={{
        backgroundColor: palette.background,
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 12),
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: MAX_BAR_WIDTH,
          height: BAR_HEIGHT,
          borderRadius: PILL,
          overflow: 'hidden',
        }}
      >
        <GlassSurface style={{ position: 'absolute', inset: 0, borderWidth: 0 }} />
        <View
          role="tablist"
          onLayout={(event) => setWidth(event.nativeEvent.layout.width - BAR_PADDING * 2)}
          style={{ flex: 1, flexDirection: 'row', padding: BAR_PADDING }}
        >
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: BAR_PADDING + (tabWidth - indicatorWidth) / 2,
                  top: BAR_PADDING,
                  bottom: BAR_PADDING,
                  width: indicatorWidth,
                  borderRadius: PILL,
                  overflow: 'hidden',
                },
                indicatorStyle,
              ]}
            >
              <View
                className={cn(
                  'absolute inset-0',
                  themeName === 'light' ? 'bg-primary/10' : 'bg-foreground/10',
                )}
              />
            </Animated.View>
          ) : null}
          {state.routes.map((route, index) => {
            const tab = tabs.find((item) => item.name === route.name);
            if (!tab) return null;
            const isFocused = index === state.index;
            const color = isFocused ? activeColor : palette.mutedForeground;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.title}, tab, ${index + 1} of ${state.routes.length}`}
                accessibilityState={{ selected: isFocused }}
                onPress={() => {
                  haptics.press();
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) navigateToTab(route.key);
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <MaterialIcons name={tab.md} size={22} color={color} />
                <RNText
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={{
                    color,
                    fontFamily: isFocused ? Fonts.bold : Fonts.semibold,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {tab.title}
                </RNText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
