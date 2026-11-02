import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, Text } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use_theme';

import { AuthHeader } from '../components/AuthHeader';
import { SignInForm } from '../components/SignInForm';
import { usePendingChallenge } from '../hooks/use_session';
import { useAuthStore } from '../store/auth_store';

const BACK_SIZE = 52;

interface SignInScreenProps {
  onBack?: () => void;
}

export function SignInScreen({ onBack }: SignInScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
      {/* Scrolls the focused field (plus bottomOffset) clear of the keyboard on both platforms. */}
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

          {/* Social sign-in is not in the SRS and the backend has no provider flow yet.
              Restore this block (and add the icons) only once both exist.
          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text variant="caption">OR</Text>
            <View className="h-px flex-1 bg-border" />
          </View>
          <View className="flex-row justify-center gap-6">
            <IconButton icon={GoogleIcon} label="Continue with Google" variant="outline" />
            <IconButton icon={AppleIcon} label="Continue with Apple" variant="outline" />
          </View>
          */}

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

      {/* Outside the scroll view so it stays pinned while the form scrolls beneath it. */}
      {onBack ? (
        // Plain style, not className: NativeWind can drop classes when Pressable gets a style function.
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: insets.top + 4, left: 16, zIndex: 10 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to introduction"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
          >
            <GlassSurface
              tone="dark"
              className="rounded-full"
              style={{ width: BACK_SIZE, height: BACK_SIZE, borderRadius: BACK_SIZE / 2 }}
            >
              <ChevronLeft size={28} color={theme.primaryForeground} />
            </GlassSurface>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
