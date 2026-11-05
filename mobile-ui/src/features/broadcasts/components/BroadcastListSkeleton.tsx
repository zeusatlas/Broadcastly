import { View } from 'react-native';

import { Skeleton } from '@/components/ui';

export function BroadcastListSkeleton() {
  return (
    <View accessibilityLabel="Loading broadcasts" className="gap-5 py-4">
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} className="gap-3 border-b border-border pb-4">
          <View className="flex-row items-center justify-between gap-4">
            <Skeleton className="h-5 flex-1 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}
