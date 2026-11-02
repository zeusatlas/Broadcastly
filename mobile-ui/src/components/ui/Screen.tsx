import type { PropsWithChildren } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { cn } from '@/utils/helpers';

type ScreenProps = PropsWithChildren<{
  edges?: readonly Edge[];
  className?: string;
}>;

// Screens inside the tab navigator omit 'bottom' — the tab bar already covers it.
const DEFAULT_EDGES: readonly Edge[] = ['top', 'left', 'right'];

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

export function ScrollScreen({
  edges = DEFAULT_EDGES,
  className,
  contentContainerStyle,
  children,
  ...props
}: ScreenProps & ScrollViewProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={[
          { alignItems: 'center', paddingBottom: BottomTabInset + Spacing.xl },
          contentContainerStyle,
        ]}
        {...props}
      >
        <View className={cn('w-full px-4', className)} style={{ maxWidth: MaxContentWidth }}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
