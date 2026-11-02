import { create } from 'zustand';

import { secureStorage, STORAGE_KEYS } from '@/utils/storage';

import type { OnboardingStatus } from '../types';

interface OnboardingState {
  status: OnboardingStatus;
}

interface OnboardingActions {
  load: () => Promise<void>;
  complete: () => Promise<void>;
}

// Not registered with registerStoreReset: onboarding is per device, so sign-out must not repeat it.
export const useOnboardingStore = create<OnboardingState & OnboardingActions>()((set) => ({
  status: 'loading',

  load: async () => {
    const seen = await secureStorage.get(STORAGE_KEYS.onboardingSeen).catch(() => null);
    set({ status: seen ? 'done' : 'pending' });
  },

  complete: async () => {
    set({ status: 'done' });
    await secureStorage.set(STORAGE_KEYS.onboardingSeen, '1').catch(() => {});
  },
}));

export const useOnboardingStatus = () => useOnboardingStore((s) => s.status);
