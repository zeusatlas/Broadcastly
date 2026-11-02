import { router } from 'expo-router';

import { SignInScreen } from '@/features/auth';
import { useOnboardingStore } from '@/features/onboarding';
import { haptics } from '@/utils/haptics';

export default function SignInRoute() {
  const replayOnboarding = useOnboardingStore((s) => s.replay);

  // Un-guard onboarding first; navigate on the next tick, once (auth)/_layout has re-rendered with it.
  const backToOnboarding = () => {
    haptics.tap();
    replayOnboarding();
    setTimeout(() => router.replace('/onboarding'), 0);
  };

  return <SignInScreen onBack={backToOnboarding} />;
}
