import type { PropsWithChildren } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { enterContent } from '@/constants/motion';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { cn } from '@/utils/helpers';

type ScreenProps = PropsWithChildren<{
  edges?: readonly Edge[];
  className?: string;
}>;

// The native header covers the top and the tab bar the bottom; pass edges only for headerless screens.
const DEFAULT_EDGES: readonly Edge[] = ['left', 'right'];

export function Screen({ edges = DEFAULT_EDGES, className, children }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      <View className="flex-1 items-center">
        <View className={cn('w-full flex-1 px-4', className)} style={{ maxWidth: MaxContentWidth }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

// The scroll view is the root so tab headers sit directly above it, with no extra top padding.
export function ScrollScreen({
  className,
  contentContainerStyle,
  children,
  ...props
}: PropsWithChildren<ScrollViewProps & { className?: string }>) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={[
        { alignItems: 'center', paddingBottom: BottomTabInset + Spacing.xl },
        contentContainerStyle,
      ]}
      {...props}
    >
      <Animated.View
        entering={enterContent()}
        className={cn('w-full px-4', className)}
        style={{ maxWidth: MaxContentWidth }}
      >
        {children}
      </Animated.View>
    </ScrollView>
  );
}
