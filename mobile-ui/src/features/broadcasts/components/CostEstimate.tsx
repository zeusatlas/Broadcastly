import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface CostEstimateProps {
  recipients: number | null;
  segments: number;
  balance?: number;
}

// FR-SMS-07: shown before submit/send. The one chunky card on the screen, because it's the decision.
export function CostEstimate({ recipients, segments, balance }: CostEstimateProps) {
  const theme = useTheme();
  const cost = (recipients ?? 0) * segments;
  const hasEstimate = recipients !== null && recipients > 0 && balance !== undefined;
  const isShort = hasEstimate && cost > balance;

  const items = [
    { label: 'Recipients', value: recipients === null ? '—' : recipients.toLocaleString() },
    { label: 'Segments', value: String(segments) },
    { label: 'Est. credits', value: hasEstimate ? cost.toLocaleString() : '—', isStrong: true },
  ];

  return (
    <Card className="gap-4">
      <View className="flex-row">
        {items.map((item, index) => (
          <View
            key={item.label}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}`}
            className={cn('flex-1 items-center gap-1', index > 0 && 'border-l border-border')}
          >
            <Text
              className={cn(
                'font-sans-extrabold text-xl',
                item.isStrong ? 'text-accent-emphasis' : 'text-foreground',
              )}
            >
              {item.value}
            </Text>
            <Text variant="caption">{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
        <Wallet size={16} color={isShort ? theme.destructive : theme.mutedForeground} />
        <Text
          className={cn(
            'flex-1 text-sm',
            isShort ? 'font-sans-semibold text-destructive' : 'font-sans text-muted-foreground',
          )}
        >
          {isShort
            ? `Not enough credits: balance ${balance.toLocaleString()}`
            : hasEstimate
              ? `Balance after send: ${(balance - cost).toLocaleString()} credits`
              : 'Select recipients to calculate the credit cost.'}
        </Text>
      </View>
    </Card>
  );
}
