import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Chip, ConfirmDialog, QueryState, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';
import { createIdempotencyKey } from '@/utils/crypto';

import {
  useCreateCreditPurchaseMutation,
  useReadCreditPricingQuery,
} from '../hooks/use_credits_api';

const QUICK_AMOUNTS = [500, 1_000, 5_000, 10_000];
const MAX_CREDITS = 1_000_000;

const cedis = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Credits go into the buyer's own wallet; they are added only when the payment provider
// confirms the payment, never on the app's word (SRS 6.5).
export function BuyCreditsScreen() {
  const pricing = useReadCreditPricingQuery();
  const purchase = useCreateCreditPurchaseMutation();
  const [amount, setAmount] = useState('1000');
  // Made when the confirmation opens, so a retried purchase is the same request (NFR-REL-03).
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const credits = Number.parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const price = pricing.data?.pricePesewasPerCredit ?? 0;
  const total = credits * price;
  const amountError =
    credits > MAX_CREDITS
      ? `Buy at most ${MAX_CREDITS.toLocaleString()} credits at a time.`
      : undefined;
  const canContinue = credits > 0 && !amountError && price > 0;

  const confirm = async () => {
    if (!idempotencyKey) return;
    const response = await purchase.mutate({
      credentials: { credits },
      options: { idempotencyKey },
    });
    setIdempotencyKey(null);
    if (!response) return;
    router.back();
    notify.success(
      'Purchase started',
      response.data.status === 'completed'
        ? `${credits.toLocaleString()} credits were added.`
        : 'Credits are added as soon as the payment is confirmed.',
    );
  };

  return (
    <PageScreen
      title="Buy credits"
      backIcon={X}
      backLabel="Close buy credits"
      actions={
        <>
          <Button
            label={canContinue ? `Continue · ${cedis(total)}` : 'Continue'}
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canContinue}
            onPress={() => setIdempotencyKey(createIdempotencyKey())}
          />
          {purchase.error ? (
            <Text variant="bodyMuted" className="text-center text-destructive">
              {purchase.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="gap-6">
        <Text variant="bodyMuted">
          Credits go into your own account. One credit sends one SMS segment.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <Chip
              key={value}
              label={value.toLocaleString()}
              isSelected={credits === value}
              onPress={() => setAmount(String(value))}
            />
          ))}
        </View>
        <TextField
          label="Number of credits"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          error={amountError}
        />
        {pricing.data ? (
          <View className="gap-1 rounded-lg bg-muted/60 p-4">
            <Text variant="caption">
              {cedis(price)} per credit · {credits.toLocaleString()} credits
            </Text>
            <Text className="font-sans-extrabold text-2xl text-foreground">{cedis(total)}</Text>
          </View>
        ) : (
          <QueryState
            isLoading={pricing.isLoading}
            error={pricing.error}
            isEmpty={false}
            emptyText=""
            onRetry={pricing.refetch}
          />
        )}
      </View>

      <ConfirmDialog
        isVisible={idempotencyKey !== null}
        title="Buy these credits?"
        message={`${credits.toLocaleString()} credits for ${cedis(total)}, added to your own credits.`}
        confirmLabel="Buy credits"
        confirmingLabel="Starting payment…"
        confirmVariant="accent"
        isConfirming={purchase.isPending}
        onConfirm={confirm}
        onCancel={() => setIdempotencyKey(null)}
      />
    </PageScreen>
  );
}
