import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, QueryState, Text } from '@/components/ui';
import { useHasRole } from '@/features/auth';
import {
  useReadNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/features/notifications';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

type PreferenceKey = 'approvals' | 'imports' | 'broadcasts';

const SETTINGS: { key: PreferenceKey; title: string; description: string }[] = [
  {
    key: 'approvals',
    title: 'Approval requests',
    description: 'When a broadcast needs a decision, and the decision.',
  },
  {
    key: 'imports',
    title: 'Import results',
    description: 'When a member import finishes processing.',
  },
  {
    key: 'broadcasts',
    title: 'Broadcast outcomes',
    description: 'Delivery results and failed messages.',
  },
];

interface NotificationSettingProps {
  title: string;
  description: string;
  value: boolean;
  isDisabled: boolean;
  onChange: (value: boolean) => void;
}

function NotificationSetting({
  title,
  description,
  value,
  isDisabled,
  onChange,
}: NotificationSettingProps) {
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

// One set of preferences for the whole organisation (FR-NOT-01): everyone sees it, the head sets it.
export function NotificationSettingsScreen() {
  const canEdit = useHasRole('head');
  const preferences = useReadNotificationPreferencesQuery();
  const update = useUpdateNotificationPreferencesMutation();
  const [changes, setChanges] = useState<Partial<Record<PreferenceKey, boolean>>>({});
  const valueOf = (key: PreferenceKey) => changes[key] ?? preferences.data?.[key] ?? true;
  const hasChanges = Object.entries(changes).some(
    ([key, value]) => preferences.data?.[key as PreferenceKey] !== value,
  );

  const save = async () => {
    const response = await update.mutate(changes);
    if (!response) return;
    router.back();
    notify.success('Notification settings saved', 'They apply to everyone in your organisation.');
  };

  return (
    <PageScreen
      title="Notifications"
      backLabel="Close notification settings"
      actions={
        canEdit ? (
          <>
            <Button
              label="Save changes"
              variant="accent"
              size="lg"
              fullWidth
              disabled={!hasChanges}
              isLoading={update.isPending}
              loadingLabel="Saving…"
              onPress={save}
            />
            {update.error ? (
              <Text variant="bodyMuted" className="text-center text-destructive">
                {update.error.message}
              </Text>
            ) : null}
          </>
        ) : undefined
      }
    >
      <View className="gap-6">
        <Text variant="bodyMuted">
          {canEdit
            ? 'Choose which updates your organisation’s executives receive in the app.'
            : 'These updates are set by your head for the whole organisation.'}
        </Text>
        {preferences.data ? (
          <View>
            {SETTINGS.map((setting) => (
              <NotificationSetting
                key={setting.key}
                title={setting.title}
                description={setting.description}
                value={valueOf(setting.key)}
                isDisabled={!canEdit || update.isPending}
                onChange={(value) =>
                  setChanges((current) => ({ ...current, [setting.key]: value }))
                }
              />
            ))}
          </View>
        ) : (
          <QueryState
            isLoading={preferences.isLoading}
            error={preferences.error}
            isEmpty={false}
            emptyText=""
            onRetry={preferences.refetch}
          />
        )}
      </View>
    </PageScreen>
  );
}
