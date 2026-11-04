import { Pressable, View } from 'react-native';
import { CheckCheck, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { ApprovalItem } from '../demo_data';

interface ApprovalRowProps {
  approval: ApprovalItem;
  isLast?: boolean;
  onPress: () => void;
}

export function ApprovalRow({ approval, isLast = false, onPress }: ApprovalRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review ${approval.title}, ${approval.recipients} recipients`}
      onPress={onPress}
      className={cn('flex-row items-center gap-3 py-4 active:opacity-60', !isLast && 'border-b border-border')}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-warning/15">
        <CheckCheck size={20} color={theme.warning} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {approval.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {approval.audience} · {approval.recipients.toLocaleString()} recipients
        </Text>
        <Text variant="caption" numberOfLines={1}>
          Submitted by {approval.creator} · {approval.submittedAt}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans-semibold text-xs text-warning">Review</Text>
        <ChevronRight size={18} color={theme.mutedForeground} />
      </View>
    </Pressable>
  );
}
