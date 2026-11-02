import { View } from 'react-native';

import { BroadcastRow, type BroadcastSummary } from '@/features/broadcasts';

interface RecentBroadcastsProps {
  broadcasts: BroadcastSummary[];
  onSelect?: (id: string) => void;
}

// Same plain rows as the Broadcasts tab, so the two never drift apart.
export function RecentBroadcasts({ broadcasts, onSelect }: RecentBroadcastsProps) {
  return (
    <View>
      {broadcasts.map((broadcast, index) => (
        <BroadcastRow
          key={broadcast.id}
          broadcast={broadcast}
          isLast={index === broadcasts.length - 1}
          onPress={() => onSelect?.(broadcast.id)}
        />
      ))}
    </View>
  );
}
