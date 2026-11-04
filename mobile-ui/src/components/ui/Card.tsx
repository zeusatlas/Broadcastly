import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/helpers';

export type CardProps = ViewProps & {
  variant?: 'elevated' | 'flat';
  className?: string;
};

export function Card({ variant = 'elevated', className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-xl border border-border p-4',
        variant === 'elevated' ? 'bg-card' : 'bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  className?: string;
};

export function CardHeader({ title, subtitle, className, ...props }: CardHeaderProps) {
  return (
    <View className={cn('gap-1', className)} {...props}>
      <Text variant="heading">{title}</Text>
      {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
    </View>
  );
}

export function CardContent({
  className,
  ...props
}: PropsWithChildren<ViewProps> & { className?: string }) {
  return <View className={cn('mt-3 gap-2', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: PropsWithChildren<ViewProps> & { className?: string }) {
  return (
    <View className={cn('mt-4 flex-row items-center justify-end gap-2', className)} {...props} />
  );
}
