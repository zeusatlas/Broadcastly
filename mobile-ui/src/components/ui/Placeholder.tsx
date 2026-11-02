import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use_theme';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function Placeholder({ title, description, icon: Icon }: PlaceholderProps) {
  const theme = useTheme();

  return (
    <Screen className="items-center justify-center gap-3">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon size={26} color={theme.mutedForeground} />
      </View>
      <Text variant="title">{title}</Text>
      <Text variant="bodyMuted" className="text-center">
        {description}
      </Text>
    </Screen>
  );
}
