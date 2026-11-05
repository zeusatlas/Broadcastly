import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Everything here is inlined into the bundle and readable by anyone who installs the app.
// Per NFR-SEC-02, no credential, provider key or payment secret may ever be added.

const DEV_API_URL = 'http://localhost:8000/api/v1';
const LOOPBACK = /^(localhost|127\.0\.0\.1)$/;

// On a phone, "localhost" is the phone itself. In development, point at the computer Expo Go
// loaded the app from (hostUri, e.g. "172.20.10.12:8081"), so no IP has to be typed or updated.
function reachableFromDevice(url: string): string {
  if (!__DEV__ || Platform.OS === 'web') return url;

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!devHost || LOOPBACK.test(devHost)) return url;

  // A regex, not URL: React Native's URL does not support setting `hostname`.
  return url.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/, `$1${devHost}`);
}

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromConfig = Constants.expoConfig?.extra?.apiUrl;
  const url = fromEnv || (typeof fromConfig === 'string' ? fromConfig : '') || '';

  if (!url) {
    if (__DEV__) return reachableFromDevice(DEV_API_URL);
    throw new Error('EXPO_PUBLIC_API_URL is not set. See .env.example.');
  }

  // Bearer tokens and member data must never travel in clear text outside local development.
  if (!__DEV__ && !url.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_API_URL must use https:// in non-development builds.');
  }

  return reachableFromDevice(url);
}

// Files the server links to (e.g. organisation logos) are built from its own base URL, which is
// localhost in development; send them through the same rewrite as API calls.
export const deviceUrl = (url: string | null | undefined): string | null =>
  url ? reachableFromDevice(url) : null;

export const ENV = {
  apiUrl: resolveApiUrl(),
  isDev: __DEV__,
} as const;
