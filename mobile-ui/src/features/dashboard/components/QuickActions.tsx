import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { haptics } from '@/utils/haptics';

export interface QuickAction {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  href: Href;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

// One row of icon shortcuts; the label sits under the icon so four fit on a small phone.
export function QuickActions({ actions }: QuickActionsProps) {
  const theme = useTheme();

  return (
    <View className="flex-row">
      {actions.map(({ key, label, hint, icon: Icon, href }) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={hint}
          onPress={() => {
            haptics.tap();
            router.push(href);
          }}
          className="flex-1 items-center gap-2 active:opacity-70"
        >
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
            <Icon size={24} color={theme.accentEmphasis} />
          </View>
          <Text
            className="text-center font-sans-semibold text-xs text-foreground"
            numberOfLines={2}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
