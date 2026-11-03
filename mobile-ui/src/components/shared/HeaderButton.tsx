import { router } from 'expo-router';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';

import { Avatar, GlassSurface, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

export const GLASS_BUTTON_SIZE = 48;

export interface HeaderButtonProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  // Unread count shown as a red pill on the corner; hidden at 0.
  badgeCount?: number;
}

// Plain icon for the native header. No circle of our own: iOS 26 wraps header items in Liquid Glass.
export function HeaderButton({ icon: Icon, label, onPress, badgeCount = 0 }: HeaderButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badgeCount > 0 ? `${label}, ${badgeCount} unread` : label}
      onPress={onPress}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center active:opacity-60"
    >
      <Icon size={22} strokeWidth={2.25} color={theme.foreground} />
      {badgeCount > 0 ? (
        <View
          pointerEvents="none"
          className="absolute right-0.5 top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1"
        >
          <Text className="font-sans-bold text-[10px] leading-3 text-destructive-foreground">
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ProfileButton({ name }: { name: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open your profile"
      onPress={() => router.push('/profile')}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center active:opacity-70"
    >
      <Avatar name={name} size="sm" className="border-b-2" />
    </Pressable>
  );
}

// 48pt round glass button floating over the page (PageScreen floatingHeader): Liquid Glass on
// iOS 26+, blur + tint elsewhere. Drawn inside the page so it moves with custom transitions.
export function GlassHeaderButton({ icon: Icon, label, onPress }: HeaderButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: GLASS_BUTTON_SIZE,
        height: GLASS_BUTTON_SIZE,
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <GlassSurface
        className="rounded-full"
        style={{ width: GLASS_BUTTON_SIZE, height: GLASS_BUTTON_SIZE, borderRadius: 24 }}
      >
        <Icon size={26} strokeWidth={2.25} color={theme.foreground} />
      </GlassSurface>
    </Pressable>
  );
}

// Android draws its system back arrow on whichever header owns the activity's action bar, and our
// nested stacks (root + each TabStack) fight over it, so it vanished on some screens. Ours always shows.
export const androidHeaderBack =
  Platform.OS === 'android'
    ? ({ canGoBack }: { canGoBack?: boolean }) =>
        canGoBack ? (
          <HeaderButton icon={ArrowLeft} label="Go back" onPress={() => router.back()} />
        ) : null
    : undefined;
