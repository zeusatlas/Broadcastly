import { Stack } from 'expo-router';

import { usePendingChallenge } from '@/features/auth';
import { useOnboardingStatus } from '@/features/onboarding';

// Public routes. Reachable only while signed out — see the guard in app/_layout.tsx.
// Onboarding shows once per device; verify-otp only while a sign-in code is pending.
export default function AuthLayout() {
  const isOnboardingPending = useOnboardingStatus() === 'pending';
  const hasPendingCode = usePendingChallenge() !== null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Protected guard={isOnboardingPending} redirectTo="/sign-in">
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="sign-in" />
      <Stack.Protected guard={hasPendingCode} redirectTo="/sign-in">
        <Stack.Screen name="verify-otp" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  );
}
