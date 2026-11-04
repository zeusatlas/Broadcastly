import { Moon, Sun, Smartphone, X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Chip, Text } from '@/components/ui';
import { useColorScheme } from '@/hooks/use_color_scheme';
import { useThemeName } from '@/hooks/use_theme';

const OPTIONS = [
  { key: 'system', label: 'System', icon: Smartphone },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
] as const;

export function AppearanceScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const current = colorScheme ?? 'system';
  const theme = useThemeName();

  return (
    <PageScreen title="Appearance" backIcon={X} backLabel="Close appearance">
      <View className="gap-6">
        <Text variant="bodyMuted">Choose how Broadcastly looks on this device.</Text>
        <View className="gap-3">
          <Text variant="overline">Theme</Text>
          <View className="flex-row flex-wrap gap-2">
            {OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                icon={option.icon}
                isSelected={current === option.key}
                onPress={() => setColorScheme(option.key)}
              />
            ))}
          </View>
          <Text variant="caption">Current display: {theme === 'dark' ? 'Dark' : 'Light'}.</Text>
        </View>
      </View>
    </PageScreen>
  );
}
