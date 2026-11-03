import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Avatar, Badge, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export interface MemberRowData {
  id: string;
  name: string;
  unit: string;
  status: 'active' | 'inactive';
}

interface MemberRowProps {
  member: MemberRowData;
  onPress?: () => void;
  isLast?: boolean;
}

// Active is the normal case, so only an inactive member carries a badge.
export function MemberRow({ member, onPress, isLast = false }: MemberRowProps) {
  const theme = useTheme();
  const isInactive = member.status === 'inactive';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${member.unit}${isInactive ? ', inactive' : ''}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-3.5 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <Avatar name={member.name} size="sm" className="border-b-2" />
      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            'font-sans-semibold text-base',
            isInactive ? 'text-muted-foreground' : 'text-foreground',
          )}
          numberOfLines={1}
        >
          {member.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {member.unit}
        </Text>
      </View>
      {isInactive ? <Badge label="Inactive" tone="neutral" variant="subtle" /> : null}
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
