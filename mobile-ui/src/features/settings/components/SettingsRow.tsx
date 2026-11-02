import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  /** Current setting, shown muted before the chevron ("System", "On"). */
  value?: string;
  hasChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

export function SettingsRow({
  icon: Icon,
  label,
  value,
  hasChevron = true,
  onPress,
  isLast = false,
}: SettingsRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      className={cn(
        'min-h-16 flex-row items-center gap-4 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <Icon size={20} color={theme.mutedForeground} />
      <Text className="flex-1 font-sans-medium text-lg text-foreground" numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text className="font-sans text-lg text-muted-foreground" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {hasChevron ? <ChevronRight size={20} color={theme.mutedForeground} /> : null}
    </Pressable>
  );
}

interface SettingsExpandableRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  isLast?: boolean;
}

// A row that opens in place (chevron points down) instead of moving to a new screen.
export function SettingsExpandableRow({
  icon: Icon,
  label,
  children,
  isLast = false,
}: SettingsExpandableRowProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className={cn(!isLast && 'border-b border-border')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        className="min-h-16 flex-row items-center gap-4 py-4 active:opacity-60"
      >
        <Icon size={20} color={theme.accentEmphasis} />
        <Text className="flex-1 font-sans-medium text-lg text-foreground" numberOfLines={1}>
          {label}
        </Text>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <ChevronDown size={22} color={theme.foreground} />
        </View>
      </Pressable>
      {isOpen ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <View className="pb-5">{children}</View>
        </Animated.View>
      ) : null}
    </View>
  );
}
