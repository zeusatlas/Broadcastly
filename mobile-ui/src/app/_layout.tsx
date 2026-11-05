// Subpath imports so only the five weights we use are bundled.
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import '@/global.css';

import { Colors } from '@/constants/theme';
import { useAuthStore, useSessionExpiry, useSessionStatus } from '@/features/auth';
import { useOnboardingStatus, useOnboardingStore } from '@/features/onboarding';
import { useThemeName } from '@/hooks/use_theme';

import { AppToaster, SystemBars } from '@/components/shared';

export { ErrorFallback as ErrorBoundary } from '@/components/shared';

SplashScreen.preventAutoHideAsync();

// React Navigation draws its own chrome, so it needs the same tokens.
function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];

  return {
    ...base,
    dark: scheme === 'dark',
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.card,
      text: palette.foreground,
      border: palette.border,
      notification: palette.critical,
    },
  };
}

export default function RootLayout() {
  const scheme = useThemeName();
  const restore = useAuthStore((state) => state.restore);
  const sessionStatus = useSessionStatus();
  const isSignedIn = sessionStatus === 'signed_in';

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const loadOnboarding = useOnboardingStore((state) => state.load);
  const onboardingStatus = useOnboardingStatus();

  useEffect(() => {
    restore();
    loadOnboarding();
  }, [restore, loadOnboarding]);

  // Fonts on error too, otherwise a missing font leaves the app stuck on splash.
  // Waiting for session restore stops a signed-in user flashing the sign-in screen.
  const isReady =
    (fontsLoaded || fontError !== null) &&
    sessionStatus !== 'restoring' &&
    onboardingStatus !== 'loading';

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useSessionExpiry(isReady);

  if (!isReady) return null;

  // The app opens at "/", which only exists in (app); redirectTo stops a signed-out launch hitting +not-found.
  const signedOutHome = onboardingStatus === 'pending' ? '/onboarding' : '/sign-in';

  // The single authentication guard. Permission guards live in (app)/_layout.tsx.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider value={navigationTheme(scheme)}>
          <SystemBars />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={isSignedIn} redirectTo={signedOutHome}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!isSignedIn} redirectTo="/">
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <AppToaster />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
