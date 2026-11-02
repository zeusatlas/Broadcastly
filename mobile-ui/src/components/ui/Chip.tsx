import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export interface ChipProps {
  label: string;
  isSelected?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
}

// Pill for filters and single choices. Selected state uses fill and weight, not colour alone.
export function Chip({ label, isSelected = false, icon: Icon, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      className={cn(
        'h-10 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-70',
        isSelected ? 'bg-primary' : 'border border-border bg-transparent',
      )}
    >
      {Icon ? (
        <Icon size={16} color={isSelected ? theme.primaryForeground : theme.mutedForeground} />
      ) : null}
      <Text
        className={cn(
          'text-sm',
          isSelected
            ? 'font-sans-bold text-primary-foreground'
            : 'font-sans-medium text-muted-foreground',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
