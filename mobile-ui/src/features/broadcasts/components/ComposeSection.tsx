import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface ComposeSectionProps {
  step: number;
  title: string;
  className?: string;
  children: ReactNode;
}

// Numbered step on the compose screen; plain, no card, so the page reads top to bottom.
export function ComposeSection({ step, title, className, children }: ComposeSectionProps) {
  return (
    <View className={cn('mt-6 gap-3', className)}>
      <View className="flex-row items-center gap-2.5">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
          <Text className="font-sans-bold text-sm text-primary-foreground">{step}</Text>
        </View>
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-foreground">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

interface ComposeRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  isDisabled?: boolean;
}

// A tappable line that opens a picker (template, units, date).
export function ComposeRow({ icon: Icon, label, value, onPress, isDisabled }: ComposeRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-border px-4 py-3 active:opacity-60 disabled:opacity-50"
    >
      <Icon size={20} color={theme.mutedForeground} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {label}
        </Text>
        {value ? (
          <Text variant="caption" className="text-sm" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
