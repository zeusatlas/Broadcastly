import { ChevronRight, Wallet } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

interface CreditBalanceCardProps {
  organisationName: string;
  role: string;
  onPress: () => void;
}

const DEMO_CREDIT_BALANCE = '12,450';

export function CreditBalanceCard({ organisationName, role, onPress }: CreditBalanceCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open credit balance"
      onPress={onPress}
      className="active:opacity-80"
    >
      <Card className="gap-5 border-primary bg-primary px-5 py-6">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text variant="heading" className="text-primary-foreground" numberOfLines={1}>
              {organisationName}
            </Text>
            <Text className="font-sans-semibold text-sm text-primary-foreground" numberOfLines={1}>
              {role}
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent/15">
            <Wallet size={21} color={theme.accentEmphasis} />
          </View>
        </View>
        <View className="gap-0.5">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-primary-foreground">
            Credit balance
          </Text>
          <Text className="font-sans-extrabold text-4xl leading-tight text-primary-foreground">
            {DEMO_CREDIT_BALANCE}
          </Text>
        </View>
        <View className="absolute bottom-5 right-5">
          <ChevronRight size={21} color={theme.accentEmphasis} />
        </View>
      </Card>
    </Pressable>
  );
}
