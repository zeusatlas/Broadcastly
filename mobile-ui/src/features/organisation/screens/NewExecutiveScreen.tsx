import { router } from 'expo-router';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Button, QueryState, SearchField, Text, TextField } from '@/components/ui';
import { useCurrentUser, useHasPermission } from '@/features/auth';
import {
  UnitPicker,
  useMemberPages,
  type MemberResponse,
  type UnitChoice,
} from '@/features/members';
import { useDebouncedValue } from '@/hooks/use_pages';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import type { Permission } from '@/types/models';
import { cn } from '@/utils/helpers';

import { useCreateExecutiveMutation, useReadPositionsQuery } from '../hooks/use_organisation_api';
import type { PositionResponse } from '../types';

const PERMISSION_LABELS: Record<Permission, string> = {
  'appointment.manage': 'Manage appointments',
  'member.manage': 'Manage members',
  'member.import': 'Import members',
  'broadcast.draft': 'Draft broadcasts',
  'broadcast.submit': 'Submit broadcasts',
  'broadcast.send': 'Send broadcasts',
  'broadcast.select_recipients': 'Select recipients',
  'broadcast.approve': 'Approve broadcasts',
  'report.view': 'View reports',
  'credit.allocate': 'Allocate credits',
  'credit.purchase': 'Purchase credits',
};

function SelectionField({
  label,
  value,
  detail,
  placeholder,
  error,
  onPress,
}: {
  label: string;
  value?: string;
  detail?: string;
  placeholder: string;
  error?: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-base text-foreground">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        accessibilityHint={error}
        onPress={onPress}
        className={cn(
          'min-h-14 flex-row items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2 active:opacity-70',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <View className="flex-1 gap-0.5">
          <Text
            className={cn(
              'font-sans-medium text-base',
              value ? 'text-foreground' : 'text-muted-foreground',
            )}
            numberOfLines={1}
          >
            {value ?? placeholder}
          </Text>
          {detail ? <Text variant="caption">{detail}</Text> : null}
        </View>
        <ChevronDown size={20} color={theme.mutedForeground} />
      </Pressable>
      {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
    </View>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        // A modal is its own window, so the page's keyboard handling can't reach it; lift the sheet here.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            className="flex-1"
          />
          <View
            className="max-h-[80%] rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text variant="heading">{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MemberSheet({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId?: string;
  onSelect: (member: MemberResponse) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const members = useMemberPages(query);

  return (
    <Sheet title="Choose a member" onClose={onClose}>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, phone or party ID"
        autoFocus
      />
      <FlatList
        data={members.items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={members.loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${item.fullName}${item.isExecutive ? ', already an executive' : ''}`}
            accessibilityState={{ checked: item.id === selectedId, disabled: item.isExecutive }}
            disabled={item.isExecutive}
            onPress={() => onSelect(item)}
            className="flex-row items-center gap-3 border-b border-border py-3.5 active:opacity-60"
          >
            <View className="flex-1 gap-0.5">
              <Text
                className={cn(
                  'font-sans-semibold text-base',
                  item.isExecutive ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {item.fullName}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {item.isExecutive
                  ? 'Already an executive'
                  : [item.partyId, item.unitName].filter(Boolean).join(' · ') || 'No party ID'}
              </Text>
            </View>
            {item.id === selectedId ? <Check size={20} color={theme.accentEmphasis} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <QueryState
            isLoading={members.isLoading}
            error={members.error}
            isEmpty
            emptyText={query ? 'No members match your search.' : 'No members yet.'}
            onRetry={members.reload}
          />
        }
        ListFooterComponent={
          members.hasNextPage && members.isFetching ? (
            <View className="py-4">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : undefined
        }
      />
    </Sheet>
  );
}

function PositionSheet({
  positions,
  selectedId,
  onSelect,
  onClose,
}: {
  positions: PositionResponse[];
  selectedId?: string;
  onSelect: (position: PositionResponse) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Sheet title="Choose a position" onClose={onClose}>
      <FlatList
        data={positions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={item.title}
            accessibilityState={{ checked: item.id === selectedId }}
            onPress={() => onSelect(item)}
            className="flex-row items-center gap-3 border-b border-border py-3.5 active:opacity-60"
          >
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-semibold text-base text-foreground">{item.title}</Text>
              <Text variant="caption" className="capitalize">
                {item.unitType.replace('_', ' ')}
              </Text>
            </View>
            {item.id === selectedId ? <Check size={20} color={theme.accentEmphasis} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <Text variant="bodyMuted" className="py-12 text-center">
            No positions are set up yet.
          </Text>
        }
      />
    </Sheet>
  );
}

function PermissionSheet({
  available,
  selected,
  onToggle,
  onClose,
}: {
  available: Permission[];
  selected: Permission[];
  onToggle: (permission: Permission) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Sheet title="Choose permissions" onClose={onClose}>
      <Text variant="caption" className="mb-2">
        You can give only the permissions you hold.
      </Text>
      <FlatList
        data={available}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={PERMISSION_LABELS[item]}
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggle(item)}
              className="flex-row items-center gap-3 border-b border-border py-3.5 active:opacity-60"
            >
              <View
                className={cn(
                  'h-6 w-6 items-center justify-center rounded-md border',
                  isSelected ? 'border-primary bg-primary' : 'border-input bg-transparent',
                )}
              >
                {isSelected ? <Check size={16} color={theme.primaryForeground} /> : null}
              </View>
              <Text className="flex-1 font-sans-medium text-base text-foreground">
                {PERMISSION_LABELS[item]}
              </Text>
            </Pressable>
          );
        }}
      />
      <Button label="Done" variant="primary" fullWidth className="mt-4" onPress={onClose} />
    </Sheet>
  );
}

type OpenSheet = 'member' | 'position' | 'permissions' | null;

// Appoints an existing member (FR-ORG-05): the account links to the member through the party ID.
export function NewExecutiveScreen() {
  const canManage = useHasPermission('appointment.manage');
  const available = useCurrentUser()?.permissions ?? [];
  const positions = useReadPositionsQuery({ enabled: canManage });
  const create = useCreateExecutiveMutation();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [position, setPosition] = useState<PositionResponse | null>(null);
  const [unit, setUnit] = useState<UnitChoice | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const hasNoPartyId = member !== null && !member.partyId;
  const isReady = Boolean(
    canManage &&
    member?.partyId &&
    email.trim() &&
    (member.phone || phone.trim()) &&
    (member.dateOfBirth || dateOfBirth.trim()) &&
    position,
  );

  const submit = async () => {
    if (!member?.partyId || !position) return;
    const response = await create.mutate({
      firstName: member.firstName,
      middleName: member.middleName ?? undefined,
      lastName: member.lastName,
      partyId: member.partyId,
      email: email.trim(),
      phone: member.phone ?? phone.trim(),
      dateOfBirth: member.dateOfBirth ?? dateOfBirth.trim(),
      positionId: position.id,
      unitId: unit?.id,
      permissions,
    });
    if (!response) return;
    router.back();
    notify.success('Executive appointed.', `${member.fullName} can now sign in.`);
  };

  return (
    <PageScreen
      title="Appoint executive"
      backIcon={X}
      backLabel="Close appointment"
      actions={
        <>
          <Button
            label="Appoint executive"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            isLoading={create.isPending}
            loadingLabel="Appointing…"
            onPress={submit}
          />
          {create.error ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {create.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        Choose a member, then the position, unit and permissions for their appointment.
      </Text>

      <View className="mt-6 gap-5">
        <SelectionField
          label="Member"
          value={member?.fullName}
          detail={
            member ? [member.partyId, member.unitName].filter(Boolean).join(' · ') : undefined
          }
          placeholder="Search members"
          error={
            hasNoPartyId
              ? 'This member has no party ID. Add one to their record first.'
              : create.error?.fieldError('partyId')
          }
          onPress={() => setSheet('member')}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={create.error?.fieldError('email')}
        />
        {member && !member.phone ? (
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 024 123 4567"
            keyboardType="phone-pad"
            error={create.error?.fieldError('phone')}
          />
        ) : null}
        {member && !member.dateOfBirth ? (
          <TextField
            label="Date of birth"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={create.error?.fieldError('dateOfBirth')}
          />
        ) : null}
        <SelectionField
          label="Position"
          value={position?.title}
          placeholder={positions.isLoading ? 'Loading positions…' : 'Choose a position'}
          error={create.error?.fieldError('positionId') ?? positions.error?.message}
          onPress={() => setSheet('position')}
        />
        <UnitPicker
          label="Unit"
          value={unit}
          placeholder="Choose a unit"
          noneLabel="No unit (organisation-wide)"
          error={create.error?.fieldError('unitId')}
          onChange={setUnit}
        />
        <SelectionField
          label="Permissions"
          value={permissions.length ? `${permissions.length} selected` : undefined}
          detail={permissions.map((item) => PERMISSION_LABELS[item]).join(', ') || undefined}
          placeholder="Choose permissions"
          error={create.error?.fieldError('permissions')}
          onPress={() => setSheet('permissions')}
        />
      </View>

      {sheet === 'member' ? (
        <MemberSheet
          selectedId={member?.id}
          onSelect={(item) => {
            setMember(item);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'position' ? (
        <PositionSheet
          positions={(positions.data ?? []).filter((item) => item.isActive)}
          selectedId={position?.id}
          onSelect={(item) => {
            setPosition(item);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'permissions' ? (
        <PermissionSheet
          available={available}
          selected={permissions}
          onToggle={(item) =>
            setPermissions((current) =>
              current.includes(item) ? current.filter((p) => p !== item) : [...current, item],
            )
          }
          onClose={() => setSheet(null)}
        />
      ) : null}
    </PageScreen>
  );
}
