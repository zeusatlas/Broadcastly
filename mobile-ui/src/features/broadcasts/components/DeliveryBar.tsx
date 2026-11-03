import { View } from 'react-native';

import { Text } from '@/components/ui';
import { cn } from '@/utils/helpers';

import type { BroadcastStatus } from '../types';

interface DeliveryBarProps {
  delivered: number;
  total: number;
  status: BroadcastStatus;
}

// Share of messages the network delivered; the count beside it means colour is never the only signal.
export function DeliveryBar({ delivered, total, status }: DeliveryBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;

  return (
    <View className="flex-row items-center gap-2">
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <View
          className={cn(
            'h-full rounded-full',
            status === 'partially_failed' ? 'bg-warning' : 'bg-success',
          )}
          style={{ width: `${percent}%` }}
        />
      </View>
      <Text variant="caption">
        {delivered.toLocaleString()} of {total.toLocaleString()}
      </Text>
    </View>
  );
}
