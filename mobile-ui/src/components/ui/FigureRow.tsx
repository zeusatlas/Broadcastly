import { View } from 'react-native';

import { cn } from '@/utils/helpers';

import { Text } from './Text';

export interface Figure {
  label: string;
  value: number;
}

// A plain strip of counts divided by hairlines: summary numbers without a card around them.
export function FigureRow({ figures }: { figures: Figure[] }) {
  return (
    <View className="flex-row" accessibilityRole="summary">
      {figures.map(({ label, value }, index) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value.toLocaleString()}`}
          className={cn(
            'flex-1 gap-0.5 py-1',
            index < figures.length - 1 && 'border-r border-border',
          )}
        >
          <Text className="text-center font-sans-extrabold text-xl text-foreground">
            {value.toLocaleString()}
          </Text>
          <Text variant="caption" className="text-center">
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
