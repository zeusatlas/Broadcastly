import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Adds a show/hide toggle and hides the value by default. */
  isPassword?: boolean;
  className?: string;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  function TextField(
    { label, error, isPassword = false, className, editable = true, onFocus, onBlur, ...props },
    ref,
  ) {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isHidden, setIsHidden] = useState(isPassword);
    const ToggleIcon = isHidden ? EyeOff : Eye;

    return (
      <View className={cn('gap-2', className)}>
        <Text className="font-sans-bold text-base text-foreground">{label}</Text>
        <View
          className={cn(
            'h-14 flex-row items-center rounded-2xl border-2 bg-muted/40 px-4',
            error ? 'border-destructive' : isFocused ? 'border-ring' : 'border-input',
            !editable && 'opacity-60',
          )}
        >
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            accessibilityHint={error}
            editable={editable}
            secureTextEntry={isHidden}
            placeholderTextColor={theme.mutedForeground}
            selectionColor={theme.ring}
            className="h-full flex-1 font-sans-medium text-base text-foreground"
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            {...props}
          />
          {isPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
              onPress={() => setIsHidden((hidden) => !hidden)}
              hitSlop={8}
              className="-mr-2 h-11 w-11 items-center justify-center"
            >
              <ToggleIcon size={20} color={theme.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        {error ? <Text className="font-sans-medium text-sm text-destructive">{error}</Text> : null}
      </View>
    );
  },
);
