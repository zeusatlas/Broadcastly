import { ChevronRight, UsersRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { AllocationRecipientResponse } from '../types';
import { describePositions } from '../utils/describe_positions';

export interface AllocateCreditsFormErrors {
  executiveId?: string;
  credits?: string;
  reason?: string;
}

interface AllocateCreditsFormProps {
  recipient: AllocationRecipientResponse | null;
  amount: string;
  reason: string;
  errors: AllocateCreditsFormErrors;
  onChooseRecipient: () => void;
  onAmountChange: (amount: string) => void;
  onReasonChange: (reason: string) => void;
}

// Who receives the credits, how many and why (FR-CR-03). The screen owns state and submission.
export function AllocateCreditsForm({
  recipient,
  amount,
  reason,
  errors,
  onChooseRecipient,
  onAmountChange,
  onReasonChange,
}: AllocateCreditsFormProps) {
  const theme = useTheme();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          recipient ? `Recipient: ${recipient.name}. Change` : 'Choose who receives the credits'
        }
        onPress={onChooseRecipient}
        className={cn(
          'mt-8 flex-row items-center gap-4 border-y py-4 active:opacity-60',
          errors.executiveId ? 'border-destructive' : 'border-border',
        )}
      >
        <UsersRound size={20} color={theme.mutedForeground} />
        <View className="flex-1 gap-0.5">
          <Text variant="caption">To</Text>
          <Text className="font-sans-semibold text-base text-foreground">
            {recipient?.name ?? 'Choose an executive'}
          </Text>
          {recipient ? (
            <Text variant="caption">
              {describePositions(recipient)} · {recipient.wallet.available.toLocaleString()} credits
            </Text>
          ) : null}
        </View>
        <ChevronRight size={20} color={theme.mutedForeground} />
      </Pressable>
      {errors.executiveId ? (
        <Text variant="caption" className="mt-2 text-destructive">
          {errors.executiveId}
        </Text>
      ) : null}

      <View className="mt-6 gap-4">
        <TextField
          label="Amount"
          placeholder="0"
          value={amount}
          onChangeText={(text) => onAmountChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          error={errors.credits}
        />
        <TextField
          label="Reason (optional)"
          placeholder="e.g. Branch meeting reminders"
          value={reason}
          onChangeText={onReasonChange}
          maxLength={220}
          error={errors.reason}
        />
      </View>
    </View>
  );
}
