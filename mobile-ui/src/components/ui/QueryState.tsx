import { CloudOff, type LucideIcon } from 'lucide-react-native';

import type { ApiError } from '@/lib/api';

import { EmptyState, LoadingState, type EmptyStateProps } from './EmptyState';

export interface QueryStateProps {
  isLoading: boolean;
  error: ApiError | null;
  isEmpty: boolean;
  // The empty state's title, e.g. "No members yet".
  emptyText: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: EmptyStateProps['action'];
  onRetry: () => void;
}

// What a list shows instead of rows: loading, a retryable error, or an empty state. Null otherwise.
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyText,
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRetry,
}: QueryStateProps) {
  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Couldn’t load this"
        description={error.message}
        action={error.isRetryable ? { label: 'Try again', onPress: onRetry } : undefined}
      />
    );
  }
  if (isEmpty) {
    return (
      <EmptyState
        title={emptyText}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }
  return null;
}
