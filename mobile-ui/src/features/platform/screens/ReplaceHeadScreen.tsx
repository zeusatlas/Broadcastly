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
import { cn } from '@/utils/helpers';

import { useOrganisationExecutivePages, useReplaceHeadMutation } from '../hooks/use_platform_api';
import type { OrganisationExecutiveResponse, ReplaceHeadRequest } from '../types';

type Mode = 'existing' | 'new';

function RadioRow({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-border py-3.5 active:opacity-60"
    >
      <Text className="font-sans-semibold text-base text-foreground">{label}</Text>
      <View
        className={cn(
          'h-6 w-6 rounded-full border',
          isSelected ? 'border-primary bg-primary' : 'border-input',
        )}
      />
    </Pressable>
  );
}

function ExecutiveSheet({
  organisationId,
  currentHeadId,
  selectedId,
  onSelect,
  onClose,
}: {
  organisationId: string;
  currentHeadId?: string;
  selectedId?: string;
  onSelect: (executive: OrganisationExecutiveResponse) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const pages = useOrganisationExecutivePages(organisationId, {
    status: 'active',
    search: query || undefined,
  });
  const items = pages.items.filter((item) => item.id !== currentHeadId);

  return (
    <BottomSheet isVisible onClose={onClose} title="Choose the new head" size="tall">
      <SearchField value={search} onChangeText={setSearch} placeholder="Search name or email" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={pages.loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={item.fullName}
            accessibilityState={{ checked: item.id === selectedId }}
            onPress={() => onSelect(item)}
            className="flex-row items-center justify-between gap-3 border-b border-border py-4 active:opacity-60"
          >
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-semibold text-base text-foreground">{item.fullName}</Text>
              <Text variant="caption" numberOfLines={1}>
                {item.positions.join(', ') || 'No position'} · {item.email}
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
            emptyText={query ? 'No one matches' : 'No other active executives'}
            emptyDescription={query ? undefined : 'Add the new head as someone new instead.'}
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

// Hands the head office to someone else in one step: the current head keeps their account, other
// positions and own credits, but loses head-only access on their next action.
export function ReplaceHeadScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    organisationId: string;
    headTitle?: string;
    currentHeadId?: string;
    currentHeadName?: string;
  }>();
  const title = (params.headTitle ?? 'Head').toLowerCase();
  const replace = useReplaceHeadMutation();
  const [mode, setMode] = useState<Mode>('existing');
  const [isPicking, setIsPicking] = useState(false);
  const [chosen, setChosen] = useState<OrganisationExecutiveResponse | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    memberNumber: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const fieldError = (field: string) => replace.error?.fieldError(field);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const newName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  const isReady =
    mode === 'existing'
      ? chosen !== null
      : [form.firstName, form.lastName, form.email, form.phone, form.dateOfBirth].every((v) =>
          v.trim(),
        );
  const nextName = mode === 'existing' ? (chosen?.fullName ?? '') : newName;

  const submit = async () => {
    const credentials: ReplaceHeadRequest =
      mode === 'existing' && chosen
        ? { executiveId: chosen.id }
        : {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            memberNumber: form.memberNumber.trim() || undefined,
            email: form.email.trim(),
            phone: form.phone.trim(),
            dateOfBirth: form.dateOfBirth.trim(),
          };
    const response = await replace.mutate({ uuid: params.organisationId, credentials });
    setIsConfirming(false);
    if (!response) return;
    router.back();
    notify.success(`${params.headTitle ?? 'Head'} replaced`, `${nextName} is now the ${title}.`);
  };

  return (
    <PageScreen
      title={`Replace the ${title}`}
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label={`Make them the ${title}`}
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            onPress={() => setIsConfirming(true)}
          />
          {replace.error && Object.keys(replace.error.fieldErrors ?? {}).length === 0 ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {replace.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        {params.currentHeadName ?? 'The current head'} stops being the {title} straight away. They
        keep their account, any other positions and their own credits.
      </Text>

      <View className="mt-6">
        <RadioRow
          label="Someone already in this organisation"
          isSelected={mode === 'existing'}
          onPress={() => setMode('existing')}
        />
        <RadioRow label="Someone new" isSelected={mode === 'new'} onPress={() => setMode('new')} />
      </View>

      {mode === 'existing' ? (
        <View className="mt-6 gap-2">
          <Text className="font-sans-bold text-base text-foreground">New {title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`New ${title}: ${chosen?.fullName ?? 'Choose an executive'}`}
            onPress={() => setIsPicking(true)}
            className="min-h-14 flex-row items-center gap-3 rounded-lg border border-input bg-muted/40 px-4 active:opacity-70"
          >
            <View className="flex-1 gap-0.5">
              <Text
                numberOfLines={1}
                className={cn(
                  'font-sans-medium text-base',
                  chosen ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {chosen?.fullName ?? 'Choose an executive'}
              </Text>
              {chosen ? (
                <Text variant="caption" numberOfLines={1}>
                  {chosen.positions.join(', ') || 'No position'}
                </Text>
              ) : null}
            </View>
            <ChevronDown size={20} color={theme.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 gap-5">
          <Text variant="caption">
            If the member ID matches a member of this organisation, that member is promoted.
          </Text>
          <TextField
            label="First name"
            value={form.firstName}
            onChangeText={set('firstName')}
            autoCapitalize="words"
            error={fieldError('firstName')}
          />
          <TextField
            label="Last name"
            value={form.lastName}
            onChangeText={set('lastName')}
            autoCapitalize="words"
            error={fieldError('lastName')}
          />
          <TextField
            label="Member ID (optional)"
            value={form.memberNumber}
            onChangeText={set('memberNumber')}
            autoCapitalize="characters"
            error={fieldError('memberNumber')}
          />
          <TextField
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={fieldError('email')}
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="e.g. 024 123 4567"
            keyboardType="phone-pad"
            error={fieldError('phone')}
          />
          <TextField
            label="Date of birth"
            value={form.dateOfBirth}
            onChangeText={set('dateOfBirth')}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={fieldError('dateOfBirth')}
          />
        </View>
      )}

      {isPicking ? (
        <ExecutiveSheet
          organisationId={params.organisationId}
          currentHeadId={params.currentHeadId}
          selectedId={chosen?.id}
          onSelect={(executive) => {
            setChosen(executive);
            setIsPicking(false);
          }}
          onClose={() => setIsPicking(false)}
        />
      ) : null}

      <ConfirmDialog
        isVisible={isConfirming}
        title={`Make ${nextName} the ${title}?`}
        message={`${params.currentHeadName ?? 'The current head'} stops being the ${title} at once. They keep their account, other positions and own credits.`}
        confirmLabel="Replace"
        confirmingLabel="Replacing…"
        confirmVariant="accent"
        isConfirming={replace.isPending}
        onConfirm={submit}
        onCancel={() => setIsConfirming(false)}
      />
    </PageScreen>
  );
}
