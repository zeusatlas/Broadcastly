import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  Check,
  LifeBuoy,
  LockKeyhole,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import { useState } from 'react';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useColorScheme } from '@/hooks/use_color_scheme';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

const APPEARANCE_OPTIONS = [
  { key: 'system', label: 'System', description: 'Use your device setting' },
  { key: 'light', label: 'Light', description: 'Use the light theme' },
  { key: 'dark', label: 'Dark', description: 'Use the dark theme' },
] as const;

export function SettingsScreen() {
  const { setColorScheme } = useColorScheme();
  const theme = useTheme();
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [appearancePreference, setAppearancePreference] =
    useState<(typeof APPEARANCE_OPTIONS)[number]['key']>('system');
  const version = Constants.expoConfig?.version ?? '1.0.04';

  return (
    <PageScreen title="Settings">
      <SettingsSection title="Preferences" className="mt-0">
        <SettingsRow
          icon={Paintbrush}
          label="Appearance"
          value={
            appearancePreference === 'dark'
              ? 'Dark'
              : appearancePreference === 'light'
                ? 'Light'
                : 'System'
          }
          onPress={() => setIsAppearanceOpen(true)}
        />
        <SettingsRow
          icon={Bell}
          label="Notifications"
          onPress={() => router.push('/settings/notifications')}
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon={ShieldCheck}
          label="Sign-in & security"
          onPress={() => router.push('/settings/security')}
        />
        <SettingsRow
          icon={Smartphone}
          label="Signed-in devices"
          onPress={() => router.push('/settings/devices')}
        />
        <SettingsRow
          icon={LockKeyhole}
          label="Privacy & data"
          onPress={() => router.push('/settings/privacy')}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon={LifeBuoy}
          label="Help & support"
          onPress={() => router.push('/settings/support')}
        />
        <SettingsRow
          icon={RotateCcw}
          label="Check for updates"
          value={`Version ${version}`}
          onPress={() => notify.info(`Broadcastly ${version} is installed on this device`)}
        />
      </SettingsSection>

      <View className="items-center gap-1 pt-8">
        <Text className="font-sans-bold text-base tracking-widest text-muted-foreground">
          Broadcastly
        </Text>
        <Text variant="caption">Version {version}</Text>
      </View>

      <Modal
        visible={isAppearanceOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAppearanceOpen(false)}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close appearance options"
            onPress={() => setIsAppearanceOpen(false)}
            className="absolute inset-0"
          />
          <View className="rounded-t-2xl border border-b-0 border-border bg-card px-5 pb-8 pt-4">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-muted-foreground" />
            <Text variant="heading">Appearance</Text>
            <Text variant="caption" className="mt-1">
              Choose the theme for this device.
            </Text>
            <View className="mt-5 gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const isSelected = appearancePreference === option.key;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label} appearance`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setAppearancePreference(option.key);
                      setColorScheme(option.key);
                      setIsAppearanceOpen(false);
                    }}
                    className={`min-h-16 flex-row items-center rounded-lg border px-4 ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}
                  >
                    <View className="flex-1 gap-0.5">
                      <Text variant="label">{option.label}</Text>
                      <Text variant="caption">{option.description}</Text>
                    </View>
                    {isSelected ? <Check size={21} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </PageScreen>
  );
}
