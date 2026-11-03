import { router } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, Text } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

// 48pt round button. Override per screen with PageScreen buttonSize.
export const HEADER_BUTTON_SIZE = 48;
const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
// Scroll distance over which the large title hands over to the compact one in the bar.
const TITLE_HANDOFF = 48;

export interface HeaderButtonProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  size?: number;
  isPlain?: boolean;
  iconSize?: number;
  // Unread count shown as a red pill on the corner; hidden at 0.
  badgeCount?: number;
}

// Round Liquid Glass button for page headers (back, settings, …). Elsewhere: blur, tint, soft shadow.
export function HeaderButton({
  icon: Icon,
  label,
  onPress,
  size = HEADER_BUTTON_SIZE,
  isPlain = false,
  iconSize = Math.round(size * 0.6),
  badgeCount = 0,
}: HeaderButtonProps) {
  const theme = useTheme();
  const round = { width: size, height: size, borderRadius: size / 2 };
  const icon = <Icon size={iconSize} strokeWidth={2.25} color={theme.foreground} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badgeCount > 0 ? `${label}, ${badgeCount} unread` : label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        round,
        { transform: [{ scale: pressed ? 0.92 : 1 }] },
        !isPlain &&
          !HAS_LIQUID_GLASS && {
            shadowColor: theme.foreground,
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
            backgroundColor: theme.card,
          },
      ]}
    >
      {isPlain ? (
        <View className="flex-1 items-center justify-center">{icon}</View>
      ) : (
        <GlassSurface className="rounded-full" style={round}>
          {icon}
        </GlassSurface>
      )}
      {badgeCount > 0 ? (
        <View
          pointerEvents="none"
          className="absolute h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1"
          style={{ top: size * 0.12, right: size * 0.1 }}
        >
          <Text className="font-sans-bold text-[10px] leading-3 text-destructive-foreground">
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

interface PageScreenProps extends PropsWithChildren {
  title?: string;
  headerRight?: Omit<HeaderButtonProps, 'size'>;
  buttonSize?: number;
  backIcon?: LucideIcon;
  backLabel?: string;
  onBack?: () => void;
  contentClassName?: string;
}

// The one wrapper for stacked screens with a back button: plain background, floating round
// buttons, large title collapsing into the bar. Change the chrome here, not per screen.
export function PageScreen({
  title,
  headerRight,
  buttonSize = HEADER_BUTTON_SIZE,
  backIcon = ChevronLeft,
  backLabel = 'Go back',
  onBack = () => router.back(),
  contentClassName,
  children,
}: PageScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const titleInset = 16 + buttonSize + 12;
  const barHeight = buttonSize + 16;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [TITLE_HANDOFF * 0.6, TITLE_HANDOFF],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, TITLE_HANDOFF], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingTop: insets.top + barHeight,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View
          className={cn('w-full flex-1 px-5', contentClassName)}
          style={{ maxWidth: MaxContentWidth }}
        >
          {title ? (
            <Animated.View style={largeTitleStyle}>
              <Text
                accessibilityRole="header"
                className="pb-2 pt-1 font-sans-extrabold text-4xl leading-tight text-foreground"
              >
                {title}
              </Text>
            </Animated.View>
          ) : null}
          {children}
        </View>
      </KeyboardAwareScrollView>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }}
      >
        <View
          pointerEvents="box-none"
          className="flex-row items-center justify-between px-4"
          style={{ height: barHeight }}
        >
          <HeaderButton icon={backIcon} label={backLabel} onPress={onBack} size={buttonSize} />

          {title ? (
            <Animated.View
              pointerEvents="none"
              style={[
                { position: 'absolute', left: titleInset, right: titleInset },
                compactTitleStyle,
              ]}
            >
              <Text
                numberOfLines={1}
                className="text-center font-sans-bold text-lg text-foreground"
              >
                {title}
              </Text>
            </Animated.View>
          ) : null}

          {headerRight ? (
            <HeaderButton {...headerRight} size={buttonSize} />
          ) : (
            <View style={{ width: buttonSize }} />
          )}
        </View>
      </View>
    </View>
  );
}
