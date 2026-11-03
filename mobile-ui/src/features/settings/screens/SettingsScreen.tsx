import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  LifeBuoy,
  LockKeyhole,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';

import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

// TODO(settings logic): rows are UI only; values and actions arrive with the settings work.
export function SettingsScreen() {
  return (
    <PageScreen title="Settings">
      <SettingsSection title="Preferences" className="mt-0">
        <SettingsRow icon={Paintbrush} label="Appearance" value="System" />
        <SettingsRow icon={Bell} label="Notifications" value="On" />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow icon={UserRound} label="Account details" />
        <SettingsRow icon={ShieldCheck} label="Sign-in & security" />
        <SettingsRow icon={Smartphone} label="Signed-in devices" />
        <SettingsRow icon={LockKeyhole} label="Privacy & data" />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon={LifeBuoy}
          label="Help & support"
          onPress={() => router.push('/settings/support')}
        />
        <SettingsRow icon={RotateCcw} label="Check for updates" hasChevron={false} />
      </SettingsSection>

      <View className="mt-auto items-center gap-1 pt-16">
        <Text className="font-sans-bold text-base tracking-widest text-muted-foreground">
          Broadcastly
        </Text>
        <Text variant="caption">Version {Constants.expoConfig?.version ?? '—'}</Text>
      </View>
    </PageScreen>
  );
}
