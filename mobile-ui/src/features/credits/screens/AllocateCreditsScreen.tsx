import { ChevronRight, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

// TODO(credits API): sample balance, limit and recipient until allocation is wired (FR-CR-03, FR-CR-04).
const DEMO_AVAILABLE = 12450;
const DEMO_ALLOCATION_LIMIT = 5000;
const DEMO_RECIPIENT = 'North Electoral Area';

// Allocate credits to an executive or unit within the user's scope and limits.
export function AllocateCreditsScreen() {
  const theme = useTheme();
  const [recipient, setRecipient] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const value = Number(amount) || 0;
  const isOverLimit = value > DEMO_ALLOCATION_LIMIT;

  return (
    <PageScreen
      title="Allocate credits"
      actions={
        <>
          <Button
            label="Review"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!recipient || value <= 0 || isOverLimit || value > DEMO_AVAILABLE}
            onPress={() => notify.info('Allocating credits is coming soon')}
          />
        </>
      }
    >
      <View className="gap-1">
        <Text variant="overline">Available</Text>
        <Text className="font-sans-extrabold text-3xl text-foreground">
          {DEMO_AVAILABLE.toLocaleString()} credits
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          recipient ? `Recipient: ${recipient}` : 'Choose who receives the credits'
        }
        onPress={() => setRecipient(DEMO_RECIPIENT)}
        className="mt-8 flex-row items-center gap-4 border-y border-border py-4 active:opacity-60"
      >
        <UsersRound size={20} color={theme.mutedForeground} />
        <View className="flex-1 gap-0.5">
          <Text variant="caption">To</Text>
          <Text className="font-sans-semibold text-base text-foreground">
            {recipient ?? 'Choose an executive or unit'}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.mutedForeground} />
      </Pressable>

      <View className="mt-6 gap-2">
        <TextField
          label="Amount"
          placeholder="0"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <Text variant="caption" className={isOverLimit ? 'text-destructive' : undefined}>
          You can allocate up to {DEMO_ALLOCATION_LIMIT.toLocaleString()} credits at a time.
        </Text>
      </View>
    </PageScreen>
  );
}
