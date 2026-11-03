import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from './Card';
import { Text } from './Text';

export interface ListCardProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

// A titled card holding a short list, with an optional "View all" link (home screen sections).
export function ListCard({
  title,
  actionLabel,
  onAction,
  children,
}: PropsWithChildren<ListCardProps>) {
  return (
    <Card className="gap-1 px-4 pb-1 pt-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel}: ${title}`}
            onPress={onAction}
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="font-sans-semibold text-sm text-accent-emphasis">{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </Card>
  );
}
