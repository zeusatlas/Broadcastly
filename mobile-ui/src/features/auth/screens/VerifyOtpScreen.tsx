import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, OtpInput, Text } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { formatCountdown, useCountdown } from '@/hooks/use_countdown';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { haptics } from '@/utils/haptics';

import { useAuthError, useIsAuthSubmitting, usePendingChallenge } from '../hooks/use_session';
import { useAuthStore } from '../store/auth_store';

const CODE_LENGTH = 6;
const KEYBOARD_CLEARANCE = 160;

// Step 2 of sign-in. Reachable only while a code is pending (guard in app/(auth)/_layout.tsx);
// success signs the user in and the root guard moves them to the app.
export function VerifyOtpScreen() {
  const theme = useTheme();
  const challenge = usePendingChallenge();
  const error = useAuthError();
  const isSubmitting = useIsAuthSubmitting();
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const resendCode = useAuthStore((s) => s.resendCode);
  const clearError = useAuthStore((s) => s.clearError);

  const [code, setCode] = useState('');
  const [action, setAction] = useState<'verify' | 'resend' | null>(null);
  const resendIn = useCountdown(challenge?.resendAvailableAt ?? 0);
  const expiresIn = useCountdown(challenge?.codeExpiresAt ?? 0);

  const challengeId = challenge?.challengeId;
  const maskedPhone = challenge?.maskedPhone;
  useEffect(() => {
    if (challengeId && maskedPhone)
      notify.success('Code sent', `Check the SMS sent to ${maskedPhone}.`);
  }, [challengeId, maskedPhone]);

  const hasWarnedExpiry = useRef(false);
  useEffect(() => {
    if (expiresIn > 0) hasWarnedExpiry.current = false;
    else if (challengeId && !hasWarnedExpiry.current) {
      hasWarnedExpiry.current = true;
      notify.warning('Code expired', 'Request a new code to continue.');
    }
  }, [expiresIn, challengeId]);

  // Back to sign-in, whose focus effect clears the challenge. Clearing it here alone leaves this
  // screen mounted (blank), because the guard does not navigate away from the focused route.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH) return;
    setAction('verify');
    const isSignedIn = await verifyCode(value);
    setAction(null);

    if (isSignedIn) {
      const name = useAuthStore.getState().user?.firstName;
      notify.success(name ? `Welcome back, ${name}` : 'Signed in');
      return;
    }

    const failure = useAuthStore.getState().error;
    setCode('');
    // 404: the sign-in itself is over (too old or finished). Nothing to retry here, so go back.
    if (failure?.kind === 'not_found') {
      notify.warning(failure.message);
      leave();
      return;
    }
    if (failure) notify.apiError(failure);
  };

  const changeCode = (value: string) => {
    setCode(value);
    if (error) clearError();
    // Submits as soon as the last digit lands, including SMS autofill and paste.
    if (value.length === CODE_LENGTH) void verify(value);
  };

  const resend = async () => {
    haptics.tap();
    setCode('');
    setAction('resend');
    const isSent = await resendCode();
    setAction(null);

    const failure = useAuthStore.getState().error;
    if (isSent) notify.success('New code sent', `Check the SMS sent to ${maskedPhone}.`);
    else if (failure?.kind === 'not_found') {
      notify.warning(failure.message);
      leave();
    } else if (failure) notify.apiError(failure);
  };

  if (!challenge) return null;

  const isVerifying = action === 'verify';
  const isResending = action === 'resend';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        // Keeps the Verify button and resend link under the code visible above the keyboard.
        bottomOffset={KEYBOARD_CLEARANCE}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        <View className="w-full self-center px-6 py-8" style={{ maxWidth: MaxContentWidth }}>
          <View className="items-center gap-2">
            <Text
              accessibilityRole="header"
              className="text-center font-sans-extrabold text-3xl text-foreground"
            >
              Verification
            </Text>
            <Text variant="bodyMuted" className="text-center text-lg">
              Enter the 6-digit code sent to
            </Text>
            <Text className="font-sans-bold text-lg text-foreground">{challenge.maskedPhone}</Text>
          </View>

          <View className="mt-8">
            <OtpInput
              value={code}
              onChangeText={changeCode}
              length={CODE_LENGTH}
              hasError={!!error && !isSubmitting}
              isDisabled={isSubmitting}
              isLoading={isVerifying}
            />
          </View>

          <View className="mt-4 min-h-6 items-center">
            {isVerifying ? (
              <Text variant="bodyMuted" className="text-sm">
                Checking your code…
              </Text>
            ) : expiresIn > 0 ? (
              <Text variant="bodyMuted" className="text-sm">
                Code expires in {formatCountdown(expiresIn)}
              </Text>
            ) : (
              <Text className="font-sans-medium text-sm text-destructive">
                This code has expired. Request a new one.
              </Text>
            )}
          </View>

          <View className="mt-6">
            <Button
              label="Verify"
              variant="accent"
              size="lg"
              fullWidth
              isLoading={isVerifying}
              loadingLabel="Verifying…"
              disabled={code.length !== CODE_LENGTH || isResending}
              onPress={() => verify(code)}
            />
          </View>

          <View className="mt-3 h-11 items-center justify-center">
            {isResending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={theme.accentEmphasis} />
                <Text className="font-sans-bold text-base text-accent-emphasis">Sending…</Text>
              </View>
            ) : resendIn > 0 ? (
              <Text variant="bodyMuted">
                Resend code in{' '}
                <Text className="font-sans-bold text-foreground">{formatCountdown(resendIn)}</Text>
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                onPress={resend}
                disabled={isSubmitting}
                hitSlop={8}
                className="h-11 justify-center px-4"
              >
                <Text className="font-sans-bold text-base text-accent-emphasis">Resend code</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
