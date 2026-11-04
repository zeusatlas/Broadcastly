import { useState } from 'react';
import { Switch, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

interface NotificationSettingProps {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function NotificationSetting({ title, description, value, onChange }: NotificationSettingProps) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-4 border-b border-border py-4">
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.muted, true: theme.primary }}
        thumbColor={theme.background}
        accessibilityLabel={title}
      />
    </View>
  );
}

export function NotificationSettingsScreen() {
  const [approvals, setApprovals] = useState(true);
  const [imports, setImports] = useState(true);
  const [broadcasts, setBroadcasts] = useState(true);

  return (
    <PageScreen title="Notifications" backLabel="Close notification settings">
      <View className="gap-6">
        <Text variant="bodyMuted">Choose which operational updates you want to receive.</Text>
        <View>
          <NotificationSetting
            title="Approval requests"
            description="When a broadcast needs your decision."
            value={approvals}
            onChange={setApprovals}
          />
          <NotificationSetting
            title="Import results"
            description="When a member import finishes processing."
            value={imports}
            onChange={setImports}
          />
          <NotificationSetting
            title="Broadcast outcomes"
            description="Delivery results and failed messages."
            value={broadcasts}
            onChange={setBroadcasts}
          />
        </View>
      </View>
    </PageScreen>
  );
}
