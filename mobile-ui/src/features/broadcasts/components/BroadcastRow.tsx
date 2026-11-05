import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { BroadcastStatus, BroadcastSummary } from '../types';
import { BROADCAST_STATUS_LABEL, BroadcastStatusBadge } from './BroadcastStatusBadge';

const HAS_OUTCOME: BroadcastStatus[] = ['processing', 'submitted', 'completed', 'partially_failed'];

interface BroadcastRowProps {
  broadcast: BroadcastSummary;
  onPress?: () => void;
  isLast?: boolean;
}

export function BroadcastRow({ broadcast, onPress, isLast = false }: BroadcastRowProps) {
  const theme = useTheme();
  const { title, audience, sentAt, status, delivered, recipients } = broadcast;
  const hasOutcome = HAS_OUTCOME.includes(status) && recipients > 0;
  const audienceText = hasOutcome
    ? `${delivered.toLocaleString()}/${recipients.toLocaleString()} delivered`
    : `${recipients.toLocaleString()} recipients`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${BROADCAST_STATUS_LABEL[status]}, ${audience}, ${sentAt}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-3.5 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 font-sans-semibold text-[15px] leading-5 text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text variant="caption" className="shrink-0">
            {sentAt}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <BroadcastStatusBadge status={status} />
          <Text variant="caption" numberOfLines={1}>
            {audience} · {audienceText}
          </Text>
        </View>
      </View>
      <ChevronRight size={17} color={theme.mutedForeground} />
    </Pressable>
  );
}
