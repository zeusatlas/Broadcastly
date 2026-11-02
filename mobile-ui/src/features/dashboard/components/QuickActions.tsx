import { router, type Href } from 'expo-router';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
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

export function QuickActions({ actions }: QuickActionsProps) {
  const theme = useTheme();

  return (
    <View className="flex-row flex-wrap gap-3">
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
          className="min-h-[112px] flex-1 basis-[44%] justify-between gap-3 rounded-2xl border-2 border-b-4 border-border bg-card p-4 active:translate-y-0.5 active:border-b-2"
        >
          <View className="flex-row items-start justify-between">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/15">
              <Icon size={22} color={theme.accentEmphasis} />
            </View>
            <ChevronRight size={18} color={theme.mutedForeground} />
          </View>
          <View className="gap-0.5">
            <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>
              {label}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {hint}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
