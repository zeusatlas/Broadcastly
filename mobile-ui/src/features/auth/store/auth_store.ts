import { create } from 'zustand';

import {
  ApiError,
  setAuthTokenProvider,
  setOrganisationProvider,
  setSessionRefresher,
  setUnauthorizedHandler,
} from '@/lib/api';
import { api } from '@/lib/api/apiSlice';
import { resetAllStores } from '@/lib/store_reset';
import type { User } from '@/types/models';
import { secureStorage, STORAGE_KEYS } from '@/utils/storage';

import type {
  AuthTokensResponse,
  OtpChallengeResponse,
  PendingChallenge,
  SessionEndReason,
  SessionStatus,
  SignInRequest,
  SignOutRequest,
} from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: SessionStatus;
  sessionExpiresAt: number | null;
  endReason: SessionEndReason | null;
  challenge: PendingChallenge | null;
  isSubmitting: boolean;
  error: ApiError | null;
  // A platform admin working inside an organisation: `user` is the working profile (role head),
  // `admin` is their own, restored on exit. Never persisted: a relaunch starts as the admin.
  workspace: { organisationId: string; admin: User } | null;
}

interface AuthActions {
  enterOrganisation: (profile: User) => void;
  exitOrganisation: () => void;
  requestCode: (body: SignInRequest) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  resendCode: () => Promise<boolean>;
  cancelChallenge: () => void;
  signOut: (body?: SignOutRequest) => Promise<boolean>;
  restore: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<boolean>;
  // Ends the session locally if its 24 hours are up. Called on resume and by the expiry timer.
  expireIfDue: () => Promise<void>;
  clearEndReason: () => void;
}

const SIGNED_OUT: AuthState = {
  user: null,
  accessToken: null,
  status: 'signed_out',
  sessionExpiresAt: null,
  endReason: null,
  challenge: null,
  isSubmitting: false,
  error: null,
  workspace: null,
};

const toPendingChallenge = (data: OtpChallengeResponse): PendingChallenge => ({
  challengeId: data.challengeId,
  maskedPhone: data.maskedPhone,
  codeExpiresAt: Date.now() + data.expiresIn * 1000,
  resendAvailableAt: Date.now() + data.resendIn * 1000,
});

async function persistTokens({
  accessToken,
  refreshToken,
  sessionExpiresAt,
}: AuthTokensResponse): Promise<void> {
  await Promise.all([
    secureStorage.set(STORAGE_KEYS.accessToken, accessToken),
    secureStorage.set(STORAGE_KEYS.refreshToken, refreshToken),
    secureStorage.set(STORAGE_KEYS.sessionExpiresAt, sessionExpiresAt),
  ]);
}

// A missing or unreadable deadline counts as expired: never keep a session we cannot date.
async function readSessionExpiry(): Promise<number | null> {
  const value = await secureStorage.get(STORAGE_KEYS.sessionExpiresAt).catch(() => null);
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? null : time;
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    secureStorage.remove(STORAGE_KEYS.accessToken),
    secureStorage.remove(STORAGE_KEYS.refreshToken),
    secureStorage.remove(STORAGE_KEYS.sessionExpiresAt),
  ]);
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  ...SIGNED_OUT,
  status: 'restoring',

  // Each sign-in step ignores repeat calls while one is in flight (a double tap, or an auto-submit
  // racing the button), so a code is never requested or checked twice.
  requestCode: async (body) => {
    if (get().isSubmitting) return false;
    set({ isSubmitting: true, error: null });

    try {
      const { data } = await api.auth.signIn(body);
      set({ challenge: toPendingChallenge(data), isSubmitting: false });

      return true;
    } catch (error) {
      set({ error: ApiError.from(error), isSubmitting: false });

      return false;
    }
  },

  verifyCode: async (code) => {
    const { challenge, isSubmitting } = get();
    if (!challenge || isSubmitting) return false;
    set({ isSubmitting: true, error: null });

    try {
      const { data } = await api.auth.verifyOtp({ challengeId: challenge.challengeId, code });
      const { user, tokens } = data;
      await persistTokens(tokens);
      set({
        user,
        accessToken: tokens.accessToken,
        sessionExpiresAt: Date.parse(tokens.sessionExpiresAt),
        status: 'signed_in',
        challenge: null,
        isSubmitting: false,
      });

      return true;
    } catch (error) {
      set({ error: ApiError.from(error), isSubmitting: false });

      return false;
    }
  },

  resendCode: async () => {
    const { challenge, isSubmitting } = get();
    if (!challenge || isSubmitting) return false;
    set({ isSubmitting: true, error: null });

    try {
      const { data } = await api.auth.resendOtp({ challengeId: challenge.challengeId });
      set({ challenge: toPendingChallenge(data), isSubmitting: false });

      return true;
    } catch (error) {
      set({ error: ApiError.from(error), isSubmitting: false });

      return false;
    }
  },

  cancelChallenge: () => set({ challenge: null, error: null }),
  signOut: async (body = {}) => {
    if (get().isSubmitting) return false;
    set({ isSubmitting: true });

    try {
      await api.auth.signOut(body);
      return true;
    } catch {
      return false;
    } finally {
      await endSession();
    }
  },

  // On launch: a session past its 24 hours ends here with no network call; a live one is restored
  // (the client refreshes an expired access token by itself) and the guard opens the home page.
  restore: async () => {
    const [accessToken, sessionExpiresAt] = await Promise.all([
      secureStorage.get(STORAGE_KEYS.accessToken).catch(() => null),
      readSessionExpiry(),
    ]);
    if (!accessToken) {
      set(SIGNED_OUT);
      return;
    }
    if (!sessionExpiresAt || sessionExpiresAt <= Date.now()) {
      await clearTokens();
      set({ ...SIGNED_OUT, endReason: 'expired' });
      return;
    }

    set({ accessToken, sessionExpiresAt });

    try {
      const { data: user } = await api.auth.getCurrentUser();
      set({ user, status: 'signed_in' });
    } catch (error) {
      const apiError = ApiError.from(error);
      // Only a rejected session wipes storage; offline launches keep it for the next attempt.
      if (apiError.kind === 'unauthorized') await clearTokens();
      set({ ...SIGNED_OUT, error: apiError.kind === 'unauthorized' ? null : apiError });
    }
  },

  expireIfDue: async () => {
    const { status, sessionExpiresAt } = get();
    if (status === 'signed_in' && sessionExpiresAt !== null && sessionExpiresAt <= Date.now()) {
      await endSession('expired');
    }
  },

  clearEndReason: () => set({ endReason: null }),
  clearError: () => set({ error: null }),

  enterOrganisation: (profile) => {
    const { user, workspace } = get();
    if (!user || !profile.organisation) return;
    resetAllStores();
    set({
      user: profile,
      workspace: { organisationId: profile.organisation.id, admin: workspace?.admin ?? user },
    });
  },

  exitOrganisation: () => {
    const { workspace } = get();
    if (!workspace) return;
    resetAllStores();
    set({ user: workspace.admin, workspace: null });
  },

  refreshUser: async () => {
    // The working profile comes from opening the organisation, not from /auth/me.
    if (get().workspace) return true;
    try {
      const { data: user } = await api.auth.getCurrentUser();
      if (get().status === 'signed_in') set({ user });
      return true;
    } catch {
      return false;
    }
  },
}));

async function endSession(reason: SessionEndReason | null = null): Promise<void> {
  await clearTokens().catch(() => {});
  resetAllStores();
  useAuthStore.setState({ ...SIGNED_OUT, endReason: reason });
}

setAuthTokenProvider(() => useAuthStore.getState().accessToken);
setOrganisationProvider(() => useAuthStore.getState().workspace?.organisationId ?? null);

setSessionRefresher(async () => {
  const refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  const { data: tokens } = await api.auth.refresh({ refreshToken });
  await persistTokens(tokens);
  useAuthStore.setState({ accessToken: tokens.accessToken });

  return tokens.accessToken;
});

setUnauthorizedHandler(() => {
  const { sessionExpiresAt } = useAuthStore.getState();
  const isExpired = sessionExpiresAt !== null && sessionExpiresAt <= Date.now();
  void endSession(isExpired ? 'expired' : null);
});
