import type { ErrorBoundaryProps } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { logger } from '@/lib/logger';

// Last line of defence for render crashes. Expo Router renders it when a route exports ErrorBoundary.
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  logger.error('Unhandled render error', { name: error.name, message: error.message });

  return (
    <Screen className="items-center justify-center gap-4">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert size={26} color={theme.destructive} />
      </View>
      <Text variant="title">Something went wrong</Text>
      <Text variant="bodyMuted" className="text-center">
        The screen could not be displayed. Your data has not been changed.
      </Text>
      <Button label="Try again" onPress={retry} accessibilityLabel="Try loading the screen again" />
    </Screen>
  );
}
