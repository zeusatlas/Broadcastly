import { Inbox, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onPress: () => void; variant?: ButtonVariant; icon?: LucideIcon };
  className?: string;
}

// What a screen or list shows when it has nothing: an icon, a short title, an optional line and action.
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={description ? `${title}. ${description}` : title}
      className={cn('items-center gap-3 px-6 py-14', className)}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon size={24} color={theme.mutedForeground} />
      </View>
      <View className="items-center gap-1">
        <Text className="text-center font-sans-bold text-base text-foreground">{title}</Text>
        {description ? (
          <Text variant="bodyMuted" className="text-center">
            {description}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          variant={action.variant ?? 'outline'}
          shape="pill"
          className="mt-1"
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}

// Shown while a screen's data is on its way, instead of a half-drawn screen.
export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      className={cn('items-center justify-center gap-3 py-14', className)}
    >
      <ActivityIndicator color={theme.mutedForeground} />
      {label ? <Text variant="caption">{label}</Text> : null}
    </View>
  );
}
