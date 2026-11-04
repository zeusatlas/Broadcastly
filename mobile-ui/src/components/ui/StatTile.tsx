import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use_theme';

import { Text } from './Text';

export interface StatTileProps {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  onPress?: () => void;
}

// Plain card like Card: the border and thicker bottom edge separate it from the page in both
// themes, so the only colour is the small gold icon chip.
export function StatTile({ label, value, caption, icon: Icon }: StatTileProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}. ${caption}`}
      className="min-h-32 flex-1 justify-between gap-3 rounded-xl border border-border bg-card p-4"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-extrabold text-2xl text-foreground" numberOfLines={1}>
            {value}
          </Text>
          <Text className="font-sans-semibold text-sm text-foreground" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
          <Icon size={18} color={theme.accentEmphasis} />
        </View>
      </View>
      <Text variant="caption" numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}
