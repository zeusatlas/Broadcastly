import { router, Stack } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterContent } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { cn } from '@/utils/helpers';

import { useCollapsingTitle } from './CollapsingTitle';
import { GLASS_BUTTON_SIZE, GlassHeaderButton, type HeaderButtonProps } from './HeaderButton';

const FOOTER_CLEARANCE = 96;

interface PageScreenProps extends PropsWithChildren {
  title?: string;
  headerRight?: HeaderButtonProps;
  // Screens that close rather than go back pass X.
  backIcon?: LucideIcon;
  backLabel?: string;
  onBack?: () => void;
  contentClassName?: string;
  footer?: ReactNode;
  // Primary buttons pinned to the bottom on a solid bar, always visible and lifted above the keyboard.
  actions?: ReactNode;
  // A tab's first screen: no back button, so the title sits just under the status bar.
  isTabRoot?: boolean;
}

// The one wrapper for titled pages. No native bar (too tall for the owner): round glass back/action
// buttons float under the status bar, the big title sits below them and collapses into a compact bar.
export function PageScreen({
  title,
  headerRight,
  backIcon = ChevronLeft,
  backLabel = 'Go back',
  onBack = () => router.back(),
  contentClassName,
  footer,
  actions,
  isTabRoot = false,
  children,
}: PageScreenProps) {
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle(title, { header: isTabRoot ? 'tab' : 'buttons' });
  const [actionsHeight, setActionsHeight] = useState(0);
  const untitledTop = isTabRoot ? insets.top + 12 : insets.top + GLASS_BUTTON_SIZE + 16;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: title ?? '' }} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: collapsing.minHeight,
          alignItems: 'center',
          paddingTop: title ? 0 : untitledTop,
          paddingBottom: actions
            ? actionsHeight + 24
            : insets.bottom + (footer ? FOOTER_CLEARANCE : 24),
        }}
      >
        <View
          className={cn('w-full flex-1 px-5', contentClassName)}
          style={{ maxWidth: MaxContentWidth }}
        >
          {collapsing.largeTitle}
          <Animated.View entering={enterContent(60)} className="flex-1">
            {children}
          </Animated.View>
        </View>
      </KeyboardAwareScrollView>

      {collapsing.bar}

      {isTabRoot ? null : (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 4 }}
        >
          <GlassHeaderButton icon={backIcon} label={backLabel} onPress={onBack} />
          {headerRight ? <GlassHeaderButton {...headerRight} /> : null}
        </View>
      )}

      {actions ? (
        <KeyboardStickyView
          offset={{ opened: insets.bottom }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <View
            onLayout={(event) => setActionsHeight(event.nativeEvent.layout.height)}
            className="items-center bg-background px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="w-full gap-2" style={{ maxWidth: MaxContentWidth }}>
              {actions}
            </View>
          </View>
        </KeyboardStickyView>
      ) : null}

      {footer ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 px-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {footer}
        </View>
      ) : null}
    </>
  );
}
