import { View } from 'react-native';

import { Text } from '@/components/ui';
import { cn } from '@/utils/helpers';

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

// Label on the left, value on the right: reads at a glance, like the phone's own settings.
export function DetailRow({ label, value, isLast = false }: DetailRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={cn(
        'min-h-14 flex-row items-center gap-4 py-3.5',
        !isLast && 'border-b border-border',
      )}
    >
      <Text variant="bodyMuted">{label}</Text>
      <Text
        numberOfLines={1}
        className="flex-1 text-right font-sans-semibold text-base text-foreground"
      >
        {value}
      </Text>
    </View>
  );
}
