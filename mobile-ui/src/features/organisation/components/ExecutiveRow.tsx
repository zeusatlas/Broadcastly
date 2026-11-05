import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { cn } from '@/utils/helpers';

import type { ExecutiveRowData } from '../demo_data';

interface ExecutiveRowProps {
  executive: ExecutiveRowData;
  isLast?: boolean;
}

export function ExecutiveRow({ executive, isLast = false }: ExecutiveRowProps) {
  const statusLabel = executive.status === 'active' ? 'Active' : executive.status;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${executive.name}, ${executive.position}, ${executive.unit}`}
      onPress={() =>
        router.push({ pathname: '/executives/[id]', params: { id: executive.id } })
      }
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <Avatar name={executive.name} size="sm" />
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {executive.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {executive.position} · {executive.unit}
        </Text>
      </View>
      <Text
        className={cn(
          'font-sans-semibold text-xs',
          executive.status === 'active' ? 'text-success' : 'text-muted-foreground',
        )}
      >
        {statusLabel}
      </Text>
    </Pressable>
  );
}
