import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';

import { AuthHeader } from '../components/AuthHeader';
import { SignInForm } from '../components/SignInForm';
import { usePendingChallenge } from '../hooks/use_session';
import { useAuthStore } from '../store/auth_store';

export function SignInScreen() {
  const challengeId = usePendingChallenge()?.challengeId;

  // Back on this screen (back gesture from verify, or a fresh visit) means the pending code is
  // abandoned: clear it so the verify screen cannot be reopened with a stale challenge.
  useFocusEffect(
    useCallback(() => {
      if (useAuthStore.getState().challenge) useAuthStore.getState().cancelChallenge();
    }, []),
  );

  // After the commit, so the verify screen's guard in (auth)/_layout.tsx already lets it through.
  useEffect(() => {
    if (challengeId) router.push('/verify-otp');
  }, [challengeId]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-card">
      <KeyboardAwareScrollView
        bottomOffset={32}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <AuthHeader />

        <View
          className="w-full flex-1 self-center px-6 pb-6 pt-1"
          style={{ maxWidth: MaxContentWidth }}
        >
          <View className="mb-7 items-center gap-2">
            <Text className="text-center font-sans-extrabold text-4xl text-foreground">
              Welcome back
            </Text>
            <Text variant="bodyMuted" className="text-center text-lg leading-7">
              Sign in with your email and phone number.
            </Text>
          </View>

          <SignInForm />

          <Text
            variant="bodyMuted"
            numberOfLines={1}
            adjustsFontSizeToFit
            className="mt-auto pt-8 text-center text-sm"
          >
            No account? Ask your constituency chairman.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
