import { CircleAlert, CircleCheck, CircleX, Info, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { useToastStore, type ToastKind } from '@/lib/toast_store';
import { cn } from '@/utils/helpers';

// Static class strings so NativeWind sees every colour at build time; each surface has its own foreground.
const STYLE: Record<ToastKind, { icon: LucideIcon; surface: string; text: string }> = {
  success: { icon: CircleCheck, surface: 'bg-success', text: 'text-success-foreground' },
  error: { icon: CircleX, surface: 'bg-destructive', text: 'text-destructive-foreground' },
  warning: { icon: CircleAlert, surface: 'bg-warning', text: 'text-warning-foreground' },
  info: { icon: Info, surface: 'bg-primary', text: 'text-primary-foreground' },
};

// The banner every notify() call shows, just under the status bar. Tap to dismiss.
export function AppToaster() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (!toast) return null;
  const { icon: Icon, surface, text } = STYLE[toast.kind];
  const iconColor = {
    success: theme.successForeground,
    error: theme.destructiveForeground,
    warning: theme.warningForeground,
    info: theme.primaryForeground,
  }[toast.kind];

  return (
    <View
      pointerEvents="box-none"
      // Inline layout: NativeWind classes are not applied to Reanimated views, so the banner would shrink.
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 50 }}
    >
      <Animated.View
        key={toast.id}
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(180)}
        style={{ width: '100%' }}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={
            toast.description ? `${toast.title}. ${toast.description}` : toast.title
          }
          accessibilityHint="Tap to dismiss"
          onPress={() => dismiss(toast.id)}
          className={cn('w-full flex-row items-center gap-3 px-4 py-3.5 shadow-lg', surface)}
          style={{ borderRadius: 24 }}
        >
          <Icon size={22} color={iconColor} />
          <View className="flex-1">
            <Text className={cn('font-sans-bold text-base', text)}>{toast.title}</Text>
            {toast.description ? (
              <Text className={cn('text-sm', text)}>{toast.description}</Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
