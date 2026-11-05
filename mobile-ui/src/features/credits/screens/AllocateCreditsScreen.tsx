import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, ConfirmDialog, QueryState, Text } from '@/components/ui';
import { notify } from '@/lib/notify';
import { createIdempotencyKey } from '@/utils/crypto';

import {
  AllocateCreditsForm,
  type AllocateCreditsFormErrors,
} from '../components/AllocateCreditsForm';
import { RecipientPicker } from '../components/RecipientPicker';
import { useCreateAllocationMutation, useReadCreditBalancesQuery } from '../hooks/use_credits_api';
import type { AllocationRecipientResponse } from '../types';

const MAX_REASON_LENGTH = 200;

interface AllocationIntent {
  signature: string;
  idempotencyKey: string;
}

// Allocate credits from the organisation's wallet to an executive's wallet (FR-CR-03, UC-04).
export function AllocateCreditsScreen() {
  const balances = useReadCreditBalancesQuery();
  const allocation = useCreateAllocationMutation();
  const [recipient, setRecipient] = useState<AllocationRecipientResponse | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [intent, setIntent] = useState<AllocationIntent | null>(null);

  const available = balances.data?.organisation?.available ?? null;
  const credits = Number(amount) || 0;
  const trimmedReason = reason.trim();
  const serverError = allocation.error;
  const hasFieldErrors = Object.keys(serverError?.fieldErrors ?? {}).length > 0;

  const errors: AllocateCreditsFormErrors = {
    executiveId: serverError?.fieldError('executiveId'),
    credits:
      available !== null && credits > available
        ? `The organisation has ${available.toLocaleString()} credits available.`
        : serverError?.fieldError('credits'),
    reason:
      trimmedReason.length > MAX_REASON_LENGTH
        ? `Keep the reason under ${MAX_REASON_LENGTH} characters.`
        : serverError?.fieldError('reason'),
  };
  const canReview =
    recipient !== null &&
    credits > 0 &&
    available !== null &&
    credits <= available &&
    trimmedReason.length <= MAX_REASON_LENGTH;

  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      if (serverError) allocation.reset();
      setter(value);
    };

  // One key per intent: reopening the confirmation for the same allocation reuses it (FR-SMS-14).
  const openConfirm = () => {
    if (!recipient) return;
    const signature = `${recipient.id}:${credits}:${trimmedReason}`;
    if (intent?.signature !== signature) {
      setIntent({ signature, idempotencyKey: createIdempotencyKey() });
    }
    setIsConfirmVisible(true);
  };

  const confirm = async () => {
    if (!recipient || !intent) return;
    const response = await allocation.mutate({
      credentials: { executiveId: recipient.id, credits, reason: trimmedReason || undefined },
      options: { idempotencyKey: intent.idempotencyKey },
    });
    setIsConfirmVisible(false);
    balances.refetch();
    if (!response) return;
    setIntent(null);
    notify.success(response.message);
    router.back();
  };

  return (
    <PageScreen
      title="Allocate credits"
      actions={
        <Button
          label="Review"
          variant="accent"
          size="lg"
          fullWidth
          disabled={!canReview || allocation.isPending}
          onPress={openConfirm}
        />
      }
    >
      <View className="gap-1">
        <Text variant="overline">Organisation available</Text>
        {available !== null ? (
          <Text className="font-sans-extrabold text-3xl text-foreground">
            {available.toLocaleString()} credits
          </Text>
        ) : (
          <QueryState
            isLoading={balances.isLoading}
            error={balances.error}
            isEmpty={!balances.isLoading && !balances.error}
            emptyText="The organisation’s balance is not available to you."
            onRetry={balances.refetch}
          />
        )}
      </View>

      <AllocateCreditsForm
        recipient={recipient}
        amount={amount}
        reason={reason}
        errors={errors}
        onChooseRecipient={() => setIsPicking(true)}
        onAmountChange={edit(setAmount)}
        onReasonChange={edit(setReason)}
      />

      {serverError && !hasFieldErrors ? (
        <Text accessibilityRole="alert" className="mt-4 font-sans-medium text-sm text-destructive">
          {serverError.message}
        </Text>
      ) : null}

      <RecipientPicker
        isVisible={isPicking}
        onClose={() => setIsPicking(false)}
        onSelect={(selected) => {
          edit(setRecipient)(selected);
          setIsPicking(false);
        }}
      />

      <ConfirmDialog
        isVisible={isConfirmVisible && recipient !== null}
        title="Allocate credits?"
        message={
          recipient && available !== null
            ? `${credits.toLocaleString()} credits to ${recipient.name}. The organisation will have ${(available - credits).toLocaleString()} credits available after.`
            : ''
        }
        confirmLabel="Allocate"
        confirmingLabel="Allocating…"
        confirmVariant="accent"
        isConfirming={allocation.isPending}
        onConfirm={confirm}
        onCancel={() => setIsConfirmVisible(false)}
      />
    </PageScreen>
  );
}
