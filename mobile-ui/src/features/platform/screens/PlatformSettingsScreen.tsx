import { useState } from 'react';
import { Switch, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, LoadingState, PageSection, QueryState, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import {
  useReadPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
} from '../hooks/use_platform_api';
import type { PlatformSettingsResponse } from '../types';

type Notifications = PlatformSettingsResponse['notificationPreferences'];

const NOTIFICATIONS: { key: keyof Notifications; title: string; description: string }[] = [
  {
    key: 'security',
    title: 'Security alerts',
    description: 'Locked accounts and suspicious sign-ins.',
  },
  { key: 'payments', title: 'Payments', description: 'Credit purchases that succeed or fail.' },
  {
    key: 'service',
    title: 'Service updates',
    description: 'Problems sending SMS or taking payments.',
  },
  {
    key: 'digest',
    title: 'Daily summary',
    description: 'One message a day with the main numbers.',
  },
];

function Toggle({
  title,
  description,
  value,
  isDisabled,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  isDisabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-4 border-b border-border py-4">
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={isDisabled}
        onValueChange={onChange}
        trackColor={{ false: theme.muted, true: theme.primary }}
        thumbColor={theme.background}
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled: isDisabled }}
      />
    </View>
  );
}

// Limits every organisation's member imports follow, and what the platform team is told about.
export function PlatformSettingsScreen() {
  const canEdit = useHasPermission('platform.settings.manage');
  const settings = useReadPlatformSettingsQuery();
  const save = useUpdatePlatformSettingsMutation();
  const [draft, setDraft] = useState<PlatformSettingsResponse | null>(null);
  const current = draft ?? settings.data;

  if (!current) {
    return (
      <PageScreen title="Platform settings">
        {settings.isLoading ? (
          <LoadingState label="Loading settings" />
        ) : (
          <QueryState
            isLoading={false}
            error={settings.error}
            isEmpty
            emptyText="Settings unavailable"
            onRetry={settings.refetch}
          />
        )}
      </PageScreen>
    );
  }

  const limits = current.importLimits;
  const edit = (change: (value: PlatformSettingsResponse) => PlatformSettingsResponse) =>
    setDraft(change(current));
  const toNumber = (text: string) => Number.parseInt(text.replace(/\D/g, ''), 10) || 0;
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(settings.data);
  const hasFileType = limits.allowedFileTypes.csv || limits.allowedFileTypes.xlsx;

  const submit = async () => {
    if (!draft) return;
    const response = await save.mutate({
      importLimits: draft.importLimits,
      notificationPreferences: draft.notificationPreferences,
    });
    if (!response) return;
    setDraft(null);
    settings.refetch();
    notify.success('Settings saved', 'They apply to every organisation from now on.');
  };

  return (
    <PageScreen
      title="Platform settings"
      actions={
        canEdit && isDirty ? (
          <>
            <Button
              label="Save settings"
              variant="accent"
              size="lg"
              fullWidth
              disabled={!hasFileType || limits.maxFileSizeMb < 1 || limits.maxRowsPerFile < 1}
              isLoading={save.isPending}
              loadingLabel="Saving…"
              onPress={submit}
            />
            {save.error ? (
              <Text className="text-center font-sans text-sm text-destructive">
                {save.error.message}
              </Text>
            ) : null}
          </>
        ) : undefined
      }
    >
      {!canEdit ? (
        <Text variant="bodyMuted">
          You can see these settings; only admins allowed to change them can.
        </Text>
      ) : null}

      <PageSection title="Member imports" className="mt-0">
        <TextField
          label="Largest file (MB)"
          value={String(limits.maxFileSizeMb)}
          onChangeText={(text) =>
            edit((value) => ({
              ...value,
              importLimits: { ...value.importLimits, maxFileSizeMb: toNumber(text) },
            }))
          }
          keyboardType="number-pad"
          editable={canEdit}
          error={save.error?.fieldError('importLimits.maxFileSizeMb')}
        />
        <TextField
          label="Most rows in one file"
          value={String(limits.maxRowsPerFile)}
          onChangeText={(text) =>
            edit((value) => ({
              ...value,
              importLimits: { ...value.importLimits, maxRowsPerFile: toNumber(text) },
            }))
          }
          keyboardType="number-pad"
          editable={canEdit}
          error={save.error?.fieldError('importLimits.maxRowsPerFile')}
        />
        <View>
          {(['csv', 'xlsx'] as const).map((type) => (
            <Toggle
              key={type}
              title={type === 'csv' ? 'CSV files' : 'Excel files (.xlsx)'}
              description={
                type === 'csv' ? 'Plain spreadsheet exports.' : 'Microsoft Excel workbooks.'
              }
              value={limits.allowedFileTypes[type]}
              isDisabled={!canEdit}
              onChange={(isOn) =>
                edit((value) => ({
                  ...value,
                  importLimits: {
                    ...value.importLimits,
                    allowedFileTypes: { ...value.importLimits.allowedFileTypes, [type]: isOn },
                  },
                }))
              }
            />
          ))}
          {!hasFileType ? (
            <Text className="pt-2 font-sans text-sm text-destructive">
              Allow at least one file type, or nobody can import members.
            </Text>
          ) : null}
        </View>
      </PageSection>

      <PageSection title="Tell the platform team about">
        <View>
          {NOTIFICATIONS.map((item) => (
            <Toggle
              key={item.key}
              title={item.title}
              description={item.description}
              value={current.notificationPreferences[item.key]}
              isDisabled={!canEdit}
              onChange={(isOn) =>
                edit((value) => ({
                  ...value,
                  notificationPreferences: { ...value.notificationPreferences, [item.key]: isOn },
                }))
              }
            />
          ))}
        </View>
      </PageSection>
    </PageScreen>
  );
}
