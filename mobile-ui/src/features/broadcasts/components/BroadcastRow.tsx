import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { BroadcastStatus, BroadcastSummary } from '../types';
import { BROADCAST_STATUS_LABEL, BroadcastStatusBadge } from './BroadcastStatusBadge';
import { DeliveryBar } from './DeliveryBar';

const HAS_OUTCOME: BroadcastStatus[] = ['processing', 'submitted', 'completed', 'partially_failed'];

interface BroadcastRowProps {
  broadcast: BroadcastSummary;
  onPress?: () => void;
  isLast?: boolean;
}

// Plain divided row: lists stay light; cards are kept for the few things that need weight.
export function BroadcastRow({ broadcast, onPress, isLast = false }: BroadcastRowProps) {
  const theme = useTheme();
  const { title, audience, sentAt, status, delivered, recipients } = broadcast;
  const hasOutcome = HAS_OUTCOME.includes(status) && recipients > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${BROADCAST_STATUS_LABEL[status]}, ${audience}, ${sentAt}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="flex-1 gap-2">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="flex-1 font-sans-bold text-base leading-6 text-foreground"
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text variant="caption">{sentAt}</Text>
          </View>
          <Text variant="bodyMuted" className="text-sm" numberOfLines={1}>
            {audience} · {recipients.toLocaleString()} recipients
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <BroadcastStatusBadge status={status} />
          {hasOutcome ? (
            <View className="flex-1">
              <DeliveryBar delivered={delivered} total={recipients} status={status} />
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
