import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/helpers';

export interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  hasError?: boolean;
  isDisabled?: boolean;
  // Pulses the boxes while the code is being checked.
  isLoading?: boolean;
  autoFocus?: boolean;
}

// One hidden input drives the boxes, so paste, SMS autofill (iOS oneTimeCode, Android sms-otp)
// and backspace all behave natively; the boxes only display what it holds.
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  hasError = false,
  isDisabled = false,
  isLoading = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [isFocused, setIsFocused] = useState(autoFocus);
  const activeIndex = Math.min(value.length, length - 1);
  const pulse = usePulse(isLoading);

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => inputRef.current?.focus()}
      disabled={isDisabled}
      className="w-full"
    >
      <Animated.View style={pulse} pointerEvents="none">
        <View className="flex-row justify-between gap-2">
          {Array.from({ length }, (_, index) => {
            const digit = value[index];
            const isActive = isFocused && index === activeIndex && !isDisabled;

            return (
              <View
                key={index}
                className={cn(
                  'h-16 flex-1 items-center justify-center rounded-lg border bg-card',
                  hasError ? 'border-destructive' : isActive ? 'border-ring' : 'border-border',
                  isDisabled && !isLoading && 'opacity-60',
                )}
              >
                <Text className="font-sans-extrabold text-2xl text-foreground">{digit ?? ''}</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={!isDisabled}
        caretHidden
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityHint={hasError ? 'The code was not accepted' : undefined}
        className="absolute h-full w-full opacity-0"
      />
    </Pressable>
  );
}

// Soft opacity breathing; skipped when the user asks for reduced motion.
function usePulse(isActive: boolean) {
  const isReducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isActive || isReducedMotion) {
      cancelAnimation(opacity);
      opacity.set(withTiming(1, { duration: 150 }));
      return;
    }
    opacity.set(
      withRepeat(withTiming(0.45, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [isActive, isReducedMotion, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}
