import { Plus, Wallet } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

interface CreditBalanceCardProps {
  balance: number;
  estimatedMessages: number;
  onTopUp?: () => void;
}

export function CreditBalanceCard({ balance, estimatedMessages, onTopUp }: CreditBalanceCardProps) {
  const theme = useTheme();

  return (
    <View className="gap-4 rounded-xl bg-primary p-5">
      <View className="flex-row items-center gap-2">
        <Wallet size={16} color={theme.primaryForeground} />
        <Text className="font-sans-medium text-xs uppercase tracking-widest text-primary-foreground/70">
          SMS credits
        </Text>
      </View>

      <View className="gap-1">
        <Text className="font-sans-extrabold text-4xl text-primary-foreground">
          {balance.toLocaleString()}
        </Text>
        <Text className="font-sans text-sm text-primary-foreground/70">
          ≈ {estimatedMessages.toLocaleString()} single-segment messages
        </Text>
      </View>

      <Button label="Top up" variant="accent" size="sm" icon={Plus} onPress={onTopUp} />
    </View>
  );
}
