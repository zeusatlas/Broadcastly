import { useEffect } from 'react';
import { AppState } from 'react-native';

import { notify } from '@/lib/notify';

import { useAuthStore } from '../store/auth_store';

// setTimeout overflows past ~24.8 days; sessions are far shorter, the cap only keeps it safe.
const MAX_TIMER_MS = 2 ** 31 - 1;

// Mounted once in the root layout. Ends the session the moment its 24 hours are up: a timer while
// the app is open, and a check whenever it returns to the foreground (timers pause in background).
// Also tells the user why they landed on sign-in, once the toast host is mounted (isReady).
export function useSessionExpiry(isReady: boolean) {
  const status = useAuthStore((s) => s.status);
  const sessionExpiresAt = useAuthStore((s) => s.sessionExpiresAt);
  const endReason = useAuthStore((s) => s.endReason);

  useEffect(() => {
    if (status !== 'signed_in' || sessionExpiresAt === null) return;

    const expireIfDue = () => void useAuthStore.getState().expireIfDue();
    const timer = setTimeout(expireIfDue, Math.min(sessionExpiresAt - Date.now(), MAX_TIMER_MS));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') expireIfDue();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [status, sessionExpiresAt]);

  useEffect(() => {
    if (!isReady || endReason !== 'expired') return;
    notify.info('Your session has ended', 'For your security, please sign in again.');
    useAuthStore.getState().clearEndReason();
  }, [isReady, endReason]);
}
