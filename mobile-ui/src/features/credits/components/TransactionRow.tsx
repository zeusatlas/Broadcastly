import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Lock,
  LockOpen,
  RotateCcw,
  Send,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { CreditTransaction, CreditTransactionType } from '../types';

const ICON: Record<CreditTransactionType, LucideIcon> = {
  purchase: ArrowDownLeft,
  allocation_in: ArrowDownLeft,
  allocation_out: ArrowUpRight,
  reservation: Lock,
  release: LockOpen,
  consumption: Send,
  refund: RotateCcw,
  reversal: RotateCcw,
  adjustment: SlidersHorizontal,
};

interface TransactionRowProps {
  transaction: CreditTransaction;
  isLast?: boolean;
}

// The sign is always printed, so money in vs out never relies on the green alone.
export function TransactionRow({ transaction, isLast = false }: TransactionRowProps) {
  const theme = useTheme();
  const { type, title, amount, occurredAt, initiatedBy } = transaction;
  // A kind the app doesn't know yet still renders instead of crashing the list.
  const Icon = ICON[type] ?? Coins;
  const isCredit = amount > 0;
  const formatted = `${isCredit ? '+' : '−'}${Math.abs(amount).toLocaleString()}`;

  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${isCredit ? 'added' : 'used'} ${Math.abs(amount)} credits, ${occurredAt}, by ${initiatedBy}`}
      className={cn('flex-row items-center gap-3 py-3.5', !isLast && 'border-b border-border')}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon size={18} color={theme.mutedForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {occurredAt} · {initiatedBy}
        </Text>
      </View>
      <Text
        className={cn('font-sans-bold text-base', isCredit ? 'text-success' : 'text-foreground')}
      >
        {formatted}
      </Text>
    </View>
  );
}
