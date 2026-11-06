import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  QueryState,
  SearchField,
  Text,
  TextField,
} from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { createIdempotencyKey } from '@/utils/crypto';
import { cn } from '@/utils/helpers';

import { useCreateCreditAdjustmentMutation, useOrganisationPages } from '../hooks/use_platform_api';

interface Choice {
  id: string;
  name: string;
}

function OrganisationSheet({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId?: string;
  onSelect: (choice: Choice) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = useOrganisationPages({ search: query || undefined });

  return (
    <BottomSheet isVisible onClose={onClose} title="Choose an organisation" size="tall">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search organisations" />
      <FlatList
        data={pages.items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={pages.loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={item.name}
            accessibilityState={{ checked: item.id === selectedId }}
            onPress={() => onSelect({ id: item.id, name: item.name })}
            className="flex-row items-center justify-between gap-3 border-b border-border py-4 active:opacity-60"
          >
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-semibold text-base text-foreground">{item.name}</Text>
              <Text variant="caption">
                {item.credits.available.toLocaleString()} credits ·{' '}
                {item.head ? `Head: ${item.head.fullName}` : 'No head yet'}
              </Text>
            </View>
            <View
              className={cn(
                'h-6 w-6 rounded-full border',
                item.id === selectedId ? 'border-primary bg-primary' : 'border-input',
              )}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <QueryState
            isLoading={pages.isLoading}
            error={pages.error}
            isEmpty
            emptyText={query ? 'No organisations match' : 'No organisations yet'}
            onRetry={pages.reload}
          />
        }
        ListFooterComponent={
          pages.hasNextPage && pages.isFetching ? (
            <View className="py-4">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : undefined
        }
      />
    </BottomSheet>
  );
}

// A correction by Broadcastly: credits go to (or come from) the organisation head's account, with a
// reason that lands in the ledger and the audit log.
export function AdjustCreditsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ organisationId?: string; organisationName?: string }>();
  const adjust = useCreateCreditAdjustmentMutation();
  const [organisation, setOrganisation] = useState<Choice | null>(
    params.organisationId
      ? { id: params.organisationId, name: params.organisationName ?? 'Organisation' }
      : null,
  );
  const [isPicking, setIsPicking] = useState(false);
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const amount = Number.parseInt(amountText.replace(/\D/g, ''), 10) || 0;
  const isReady = organisation !== null && amount > 0 && reason.trim().length >= 2;
  const fieldError = (field: string) => adjust.error?.fieldError(field);

  const submit = async () => {
    if (!organisation || !confirmKey) return;
    const response = await adjust.mutate({
      credentials: {
        organisationId: organisation.id,
        amount: direction === 'add' ? amount : -amount,
        reason: reason.trim(),
      },
      idempotencyKey: confirmKey,
    });
    setConfirmKey(null);
    if (!response) return;
    router.back();
    notify.success(
      direction === 'add' ? 'Credits added' : 'Credits removed',
      `${amount.toLocaleString()} credits · ${organisation.name}`,
    );
  };

  return (
    <PageScreen
      title="Adjust credits"
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label={direction === 'add' ? 'Add credits' : 'Remove credits'}
            variant={direction === 'add' ? 'accent' : 'destructive'}
            size="lg"
            fullWidth
            disabled={!isReady}
            onPress={() => setConfirmKey(createIdempotencyKey())}
          />
          {adjust.error && Object.keys(adjust.error.fieldErrors ?? {}).length === 0 ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {adjust.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        For corrections and goodwill credits. The change goes to the organisation head’s credits and
        is recorded with your reason.
      </Text>

      <View className="mt-6 gap-5">
        <View className="gap-2">
          <Text className="font-sans-bold text-base text-foreground">Organisation</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Organisation: ${organisation?.name ?? 'Choose an organisation'}`}
            onPress={() => setIsPicking(true)}
            className={cn(
              'min-h-14 flex-row items-center gap-3 rounded-lg border bg-muted/40 px-4 active:opacity-70',
              fieldError('organisationId') ? 'border-destructive' : 'border-input',
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'flex-1 font-sans-medium text-base',
                organisation ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {organisation?.name ?? 'Choose an organisation'}
            </Text>
            <ChevronDown size={20} color={theme.mutedForeground} />
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="font-sans-bold text-base text-foreground">Change</Text>
          {(['add', 'remove'] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: direction === option }}
              accessibilityLabel={option === 'add' ? 'Add credits' : 'Remove credits'}
              onPress={() => setDirection(option)}
              className="flex-row items-center justify-between border-b border-border py-3.5 active:opacity-60"
            >
              <Text className="font-sans-semibold text-base text-foreground">
                {option === 'add' ? 'Add credits' : 'Remove credits'}
              </Text>
              <View
                className={cn(
                  'h-6 w-6 rounded-full border',
                  direction === option ? 'border-primary bg-primary' : 'border-input',
                )}
              />
            </Pressable>
          ))}
        </View>

        <TextField
          label="Credits"
          value={amountText}
          onChangeText={setAmountText}
          placeholder="e.g. 500"
          keyboardType="number-pad"
          error={fieldError('amount')}
        />
        <TextField
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Refund for a failed broadcast"
          error={fieldError('reason')}
        />
      </View>

      {isPicking ? (
        <OrganisationSheet
          selectedId={organisation?.id}
          onSelect={(choice) => {
            setOrganisation(choice);
            setIsPicking(false);
          }}
          onClose={() => setIsPicking(false)}
        />
      ) : null}

      <ConfirmDialog
        isVisible={confirmKey !== null}
        title={direction === 'add' ? 'Add these credits?' : 'Remove these credits?'}
        message={`${amount.toLocaleString()} credits will be ${direction === 'add' ? 'added to' : 'removed from'} the head of ${organisation?.name ?? 'this organisation'}. Reason: “${reason.trim()}”.`}
        confirmLabel={direction === 'add' ? 'Add credits' : 'Remove credits'}
        confirmingLabel="Saving…"
        confirmVariant={direction === 'add' ? 'accent' : 'destructive'}
        isConfirming={adjust.isPending}
        onConfirm={submit}
        onCancel={() => setConfirmKey(null)}
      />
    </PageScreen>
  );
}
