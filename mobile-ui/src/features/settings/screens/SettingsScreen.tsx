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
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useState } from 'react';

import { PageScreen } from '@/components/shared';
import { BottomSheet, Text } from '@/components/ui';
import { useColorScheme } from '@/hooks/use_color_scheme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

const APPEARANCE_OPTIONS = [
  { key: 'system', label: 'System', description: 'Use your device setting' },
  { key: 'light', label: 'Light', description: 'Use the light theme' },
  { key: 'dark', label: 'Dark', description: 'Use the dark theme' },
] as const;

export function SettingsScreen() {
  const { setColorScheme } = useColorScheme();
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

      <BottomSheet
        isVisible={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
        title="Appearance"
        description="Choose the theme for this device."
        closeLabel="Close appearance options"
      >
        {APPEARANCE_OPTIONS.map((option) => {
          const isSelected = appearancePreference === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} appearance`}
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                setAppearancePreference(option.key);
                setColorScheme(option.key);
                setIsAppearanceOpen(false);
              }}
              className="flex-row items-center justify-between gap-3 border-b border-border py-4 active:opacity-60"
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-sans-semibold text-base text-foreground">{option.label}</Text>
                <Text variant="caption">{option.description}</Text>
              </View>
              <View
                className={cn(
                  'h-6 w-6 rounded-full border',
                  isSelected ? 'border-primary bg-primary' : 'border-input',
                )}
              />
            </Pressable>
          );
        })}
      </BottomSheet>
    </PageScreen>
  );
}
