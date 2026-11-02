import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Avatar, Badge, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface PersonRowProps {
  name: string;
  detail: string;
  status: string;
  onPress?: () => void;
  isLast?: boolean;
}

// Plain divided row for an executive or an admin. Only a non-active status gets a badge.
export function PersonRow({ name, detail, status, onPress, isLast = false }: PersonRowProps) {
  const theme = useTheme();
  const isActive = status === 'active';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${detail}, ${status}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-3.5 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <Avatar name={name} size="sm" />
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {isActive ? null : (
        <Badge
          label={status[0]!.toUpperCase() + status.slice(1)}
          tone="destructive"
          variant="subtle"
        />
      )}
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
