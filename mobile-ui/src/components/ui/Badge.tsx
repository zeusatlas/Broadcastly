import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/helpers';

export type BadgeTone =
  'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'critical';

const SOLID_CONTAINER: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  critical: 'bg-critical',
};

const SOLID_LABEL: Record<BadgeTone, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-primary-foreground',
  accent: 'text-accent-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  critical: 'text-critical-foreground',
};

const SUBTLE_CONTAINER: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-primary/15',
  accent: 'bg-accent/15',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  destructive: 'bg-destructive/15',
  critical: 'bg-critical/15',
};

const SUBTLE_LABEL: Record<BadgeTone, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-primary',
  accent: 'text-accent-emphasis',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  critical: 'text-critical',
};

export type BadgeProps = ViewProps & {
  label: string;
  tone?: BadgeTone;
  variant?: 'solid' | 'subtle';
  className?: string;
};

export function Badge({
  label,
  tone = 'neutral',
  variant = 'solid',
  className,
  ...props
}: BadgeProps) {
  const isSolid = variant === 'solid';

  return (
    <View
      accessibilityRole="text"
      className={cn(
        'self-start rounded-full px-2.5 py-1',
        isSolid ? SOLID_CONTAINER[tone] : SUBTLE_CONTAINER[tone],
        className,
      )}
      {...props}
    >
      <Text
        className={cn(
          'font-sans-semibold text-xs',
          isSolid ? SOLID_LABEL[tone] : SUBTLE_LABEL[tone],
        )}
      >
        {label}
      </Text>
    </View>
  );
}
