import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeName } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export type GlassTone = 'light' | 'dark';

interface GlassSurfaceProps extends PropsWithChildren {
  /** 'dark' suits white content (icons on a brand header); 'light' suits dark content. */
  tone?: GlassTone;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();

// iOS 26+ gets native Liquid Glass; elsewhere a blur plus a tint and hairline edge, so the content
// stays legible over any background. Android blur degrades to the tint alone.
export function GlassSurface({ tone = 'light', className, style, children }: GlassSurfaceProps) {
  const scheme = useThemeName();
  const isDark = tone === 'dark' || scheme === 'dark';

  if (HAS_LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
        isInteractive
        style={style}
      >
        <View className="flex-1 items-center justify-center">{children}</View>
      </GlassView>
    );
  }

  return (
    <View
      className={cn(
        'overflow-hidden border',
        tone === 'dark' ? 'border-primary-foreground/30' : 'border-border/60',
        className,
      )}
      style={style}
    >
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className={cn('absolute inset-0', tone === 'dark' ? 'bg-backdrop/30' : 'bg-card/70')} />
      <View className="flex-1 items-center justify-center">{children}</View>
    </View>
  );
}
