import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/hooks/use_theme';
import type { ApiError } from '@/lib/api';

import { Button } from './Button';
import { Text } from './Text';

export interface QueryStateProps {
  isLoading: boolean;
  error: ApiError | null;
  isEmpty: boolean;
  emptyText: string;
  onRetry: () => void;
}

// What a list shows instead of rows: loading, a retryable error, or an empty message. Null otherwise.
export function QueryState({ isLoading, error, isEmpty, emptyText, onRetry }: QueryStateProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color={theme.mutedForeground} />
      </View>
    );
  }
  if (error) {
    return (
      <View className="items-center gap-3 py-8">
        <Text variant="bodyMuted" className="text-center">
          {error.message}
        </Text>
        {error.isRetryable ? (
          <Button label="Try again" variant="outline" onPress={onRetry} />
        ) : null}
      </View>
    );
  }
  if (isEmpty) {
    return (
      <Text variant="bodyMuted" className="py-8 text-center">
        {emptyText}
      </Text>
    );
  }
  return null;
}
