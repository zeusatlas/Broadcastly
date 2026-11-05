import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Chip, ConfirmDialog, Text, TextField } from '@/components/ui';
import { useCurrentUser, useHasPermission } from '@/features/auth';
import { useReadUnitsQuery } from '@/features/organisation';
import { useDebouncedValue } from '@/hooks/use_pages';
import { notify } from '@/lib/notify';

import { BroadcastComposer } from '../components/BroadcastComposer';
import { ComposeSection } from '../components/ComposeSection';
import { CostEstimate } from '../components/CostEstimate';
import { RecipientPicker } from '../components/RecipientPicker';
import {
  useCreateBroadcastDraftMutation,
  useEstimateBroadcastQuery,
  useReadBroadcastQuery,
  useUpdateBroadcastDraftMutation,
} from '../hooks/use_broadcasts';
import { useSendBroadcast } from '../hooks/use_send_broadcast';
import type { AudienceLevel, EstimateBroadcastRequest } from '../types';
import {
  availablePresets,
  describeSchedule,
  PRESET_LABELS,
  scheduledAtFor,
  type SchedulePreset,
} from '../utils/schedule_presets';
import { estimateSegments } from '../utils/sms_segments';

// New broadcast, or editing a draft when opened with ?broadcastId= (e.g. after a rejection).
export function NewBroadcastScreen() {
  const user = useCurrentUser();
  const canSelectRecipients = useHasPermission('broadcast.select_recipients');
  const isOrganisationWide =
    user?.appointments.some((appointment) => appointment.unitId === null) ?? false;

  const { templateBody, broadcastId } = useLocalSearchParams<{
    templateBody?: string;
    broadcastId?: string;
  }>();
  const existing = useReadBroadcastQuery(broadcastId ?? '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState(templateBody ?? '');
  const [level, setLevel] = useState<AudienceLevel>(isOrganisationWide ? 'constituency' : 'branch');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [preset, setPreset] = useState<SchedulePreset>('now');
  const presets = availablePresets();

  // Fill the form once from the draft being edited (state set during render, React's pattern).
  if (existing.data && loadedId !== existing.data.id) {
    setLoadedId(existing.data.id);
    setTitle(existing.data.title ?? '');
    setMessage(existing.data.message);
    setLevel(existing.data.audience.level);
    setSelectedUnitIds(existing.data.audience.unitIds ?? []);
  }

  const create = useCreateBroadcastDraftMutation();
  const update = useUpdateBroadcastDraftMutation();
  const dispatch = useSendBroadcast();
  const units = useReadUnitsQuery(
    { page: 1, pageSize: 100 },
    { enabled: canSelectRecipients && level !== 'constituency' },
  );
  const levelUnits = (units.data?.items ?? []).filter((unit) => unit.type === level);
  const localEstimate = useMemo(() => estimateSegments(message), [message]);

  const hasAudience = level === 'constituency' || selectedUnitIds.length > 0;
  const audience = {
    level,
    unitIds: level === 'constituency' || selectedUnitIds.length === 0 ? undefined : selectedUnitIds,
  };
  // Debounced as a string: a fresh object each render would never settle.
  const estimateKey = useDebouncedValue(
    message.trim() && hasAudience ? JSON.stringify({ message: message.trim(), audience }) : '',
    500,
  );
  const estimateRequest = useMemo(
    () => (estimateKey ? (JSON.parse(estimateKey) as EstimateBroadcastRequest) : null),
    [estimateKey],
  );
  const estimate = useEstimateBroadcastQuery(estimateRequest);
  const recipients = estimateRequest ? (estimate.data?.recipientCount ?? null) : null;

  const isEditing = Boolean(broadcastId);
  const canSave = message.trim().length > 0 && hasAudience && (!isEditing || loadedId !== null);
  const primaryLabel = dispatch.canSend
    ? 'Review and send'
    : dispatch.canDispatch
      ? 'Review and submit'
      : 'Save draft';
  const actionError = create.error ?? update.error ?? dispatch.error ?? estimate.error;

  const saveDraft = async () => {
    if (!canSave) return;
    const fields = { title: title.trim() || undefined, message: message.trim(), audience };
    const response = broadcastId
      ? await update.mutate({
          broadcastId,
          credentials: { ...fields, title: fields.title ?? null },
        })
      : await create.mutate(fields);
    if (!response) return;
    if (!dispatch.canDispatch) {
      router.back();
      notify.success('Draft saved', 'Someone with send rights can send it.');
      return;
    }
    dispatch.open(response.data, scheduledAtFor(preset));
  };

  const confirmDispatch = async () => {
    const scheduledAt = dispatch.scheduledAt;
    const title = await dispatch.confirm();
    if (!title) return;
    router.back();
    notify.success(title, describeSchedule(scheduledAt));
  };

  const keepAsDraft = () => {
    dispatch.close();
    router.back();
    notify.info('Saved to drafts', 'You can send it later from Broadcasts.');
  };

  return (
    <PageScreen
      title={isEditing ? 'Edit broadcast' : 'New broadcast'}
      actions={
        <>
          <Button
            label={primaryLabel}
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canSave}
            isLoading={create.isPending || update.isPending}
            loadingLabel="Saving…"
            onPress={saveDraft}
          />
          {actionError ? (
            <Text variant="bodyMuted" className="text-center text-destructive">
              {actionError.message}
            </Text>
          ) : null}
        </>
      }
    >
      <ComposeSection step={1} title="Message" className="mt-0">
        <TextField
          label="Broadcast title"
          value={title}
          onChangeText={setTitle}
          placeholder="Optional short title"
          maxLength={150}
        />
        <BroadcastComposer
          message={message}
          onChangeMessage={setMessage}
          estimate={localEstimate}
        />
      </ComposeSection>

      <ComposeSection step={2} title="Recipients">
        <RecipientPicker
          level={level}
          canReachWhole={isOrganisationWide}
          onChangeLevel={(nextLevel) => {
            setLevel(nextLevel);
            setSelectedUnitIds([]);
          }}
          scopeName={user?.organisation?.name ?? 'Your organisation'}
          recipients={recipients}
          units={levelUnits}
          selectedUnitIds={selectedUnitIds}
          isLoadingUnits={units.isLoading}
          onToggleUnit={(unitId) =>
            setSelectedUnitIds((current) =>
              current.includes(unitId)
                ? current.filter((selected) => selected !== unitId)
                : [...current, unitId],
            )
          }
        />
        {estimate.data && estimateRequest
          ? (() => {
              const { duplicateCount, invalidCount } = estimate.data;
              const left = duplicateCount + invalidCount;
              return left > 0 ? (
                <Text variant="caption">
                  Left out: {duplicateCount} duplicate and {invalidCount} invalid numbers.
                </Text>
              ) : null;
            })()
          : null}
      </ComposeSection>

      {dispatch.canDispatch ? (
        <ComposeSection step={3} title="Delivery">
          <View className="flex-row flex-wrap gap-2">
            {presets.map((item) => (
              <Chip
                key={item}
                label={PRESET_LABELS[item]}
                isSelected={preset === item}
                onPress={() => setPreset(item)}
              />
            ))}
          </View>
          <Text variant="caption">
            {preset === 'now'
              ? dispatch.canSend
                ? 'Sends as soon as you confirm.'
                : 'Sends as soon as it is approved.'
              : `${describeSchedule(scheduledAtFor(preset))}${dispatch.canSend ? '' : ', if approved by then'}. Credits are held until it goes out.`}
          </Text>
        </ComposeSection>
      ) : null}

      <View className="mt-6 gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-foreground">
          Estimate
        </Text>
        <CostEstimate
          recipients={recipients}
          segments={estimate.data?.segments ?? Math.max(localEstimate.segments, 1)}
          balance={estimate.data?.wallet.available}
        />
      </View>

      <ConfirmDialog
        {...dispatch.dialog}
        confirmVariant="accent"
        onConfirm={confirmDispatch}
        onCancel={keepAsDraft}
      />
    </PageScreen>
  );
}
