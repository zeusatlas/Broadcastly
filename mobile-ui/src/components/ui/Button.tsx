import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export type ButtonVariant =
  'primary' | 'secondary' | 'accent' | 'critical' | 'destructive' | 'outline' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonShape = 'rounded' | 'pill';

const VARIANT_FACE: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  critical: 'bg-critical',
  destructive: 'bg-destructive',
  outline: 'border border-border bg-card',
  ghost: 'bg-transparent',
};

const VARIANT_LABEL: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  accent: 'text-accent-foreground',
  critical: 'text-critical-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  ghost: 'text-primary',
};

// Minimum 44pt tall per WCAG 2.5.8 and the iOS HIG touch target floor.
const SIZE_FACE: Record<ButtonSize, string> = {
  sm: 'h-11 px-3 gap-1.5',
  md: 'h-12 px-4 gap-2',
  lg: 'h-14 px-6 gap-2.5',
};

const SIZE_LABEL: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

const SIZE_ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

const SIZE_BOX: Record<ButtonSize, string> = {
  sm: 'h-11 w-11',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: LucideIcon;
  isLoading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  className?: string;
};

function useForegroundColor(variant: ButtonVariant, ghostColor: 'primary' | 'foreground') {
  const theme = useTheme();

  return {
    primary: theme.primaryForeground,
    secondary: theme.secondaryForeground,
    accent: theme.accentForeground,
    critical: theme.criticalForeground,
    destructive: theme.destructiveForeground,
    outline: theme.foreground,
    ghost: theme[ghostColor],
  }[variant];
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  icon: Icon,
  isLoading = false,
  loadingLabel,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const foreground = useForegroundColor(variant, 'primary');
  const isDisabled = disabled || isLoading;
  const radius = 'rounded-full';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isLoading && loadingLabel ? loadingLabel : label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      // Loading keeps full colour (it is working, not unavailable); only a disabled button fades.
      className={cn(fullWidth && 'w-full', disabled && !isLoading && 'opacity-50', className)}
      {...props}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'flex-row items-center justify-center border',
            radius,
            SIZE_FACE[size],
            VARIANT_FACE[variant],
            variant === 'outline' ? 'border-border' : 'border-transparent',
          )}
          style={{ opacity: pressed ? 0.78 : 1 }}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color={foreground} />
              {loadingLabel ? (
                <Text
                  className={cn('font-sans-semibold', SIZE_LABEL[size], VARIANT_LABEL[variant])}
                >
                  {loadingLabel}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              {Icon ? <Icon size={SIZE_ICON[size]} color={foreground} /> : null}
              <Text className={cn('font-sans-semibold', SIZE_LABEL[size], VARIANT_LABEL[variant])}>
                {label}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

export type IconButtonProps = Omit<ButtonProps, 'icon' | 'isLoading' | 'fullWidth'> & {
  icon: LucideIcon;
};

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled,
  className,
  ...props
}: IconButtonProps) {
  const foreground = useForegroundColor(variant, 'foreground');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={cn(
        'items-center justify-center rounded-full',
        SIZE_BOX[size],
        VARIANT_FACE[variant],
        disabled && 'opacity-50',
        className,
      )}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      {...props}
    >
      <Icon size={SIZE_ICON[size] + 2} color={foreground} />
    </Pressable>
  );
}
