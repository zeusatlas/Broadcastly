// Every persisted key lives here, so a sign-out can find and clear all of them.
export const STORAGE_KEYS = {
  accessToken: 'auth.access_token',
  refreshToken: 'auth.refresh_token',
  sessionExpiresAt: 'auth.session_expires_at',
  onboardingSeen: 'app.onboarding_seen',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
