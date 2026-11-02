import { useAuthStore } from '../store/auth_store';

// Narrow selectors: a component reading the whole store re-renders on every unrelated change.
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useSessionStatus = () => useAuthStore((state) => state.status);
export const useIsSignedIn = () => useAuthStore((state) => state.status === 'signed_in');
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthSubmitting = () => useAuthStore((state) => state.isSubmitting);
export const usePendingChallenge = () => useAuthStore((state) => state.challenge);
