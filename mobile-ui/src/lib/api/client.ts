import {
  create,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ENV } from '@/config/env';
import { logger } from '@/lib/logger';

import { ApiError } from './errors';

const REQUEST_TIMEOUT_MS = 20_000;

declare module 'axios' {
  interface AxiosRequestConfig {
    // Set on endpoints that must never trigger a session refresh, e.g. sign-in and refresh itself.
    skipAuthRefresh?: boolean;
    hasRetriedAuth?: boolean;
  }
}

type TokenProvider = () => string | null | Promise<string | null>;
type SessionRefresher = () => Promise<string | null>;

let getAccessToken: TokenProvider = () => null;
let refreshSession: SessionRefresher | null = null;
let onUnauthorized: () => void = () => {};
let pendingRefresh: Promise<string | null> | null = null;

// Injected rather than imported, so the network layer never depends on a feature module.
export function setAuthTokenProvider(provider: TokenProvider): void {
  getAccessToken = provider;
}

export function setSessionRefresher(refresher: SessionRefresher | null): void {
  refreshSession = refresher;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// Concurrent 401s share one refresh call instead of racing and invalidating each other's tokens.
function refreshOnce(): Promise<string | null> {
  if (!refreshSession) return Promise.resolve(null);

  pendingRefresh ??= refreshSession().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

// Shown in the Expo terminal at start-up, so a wrong or stale EXPO_PUBLIC_API_URL is obvious.
logger.debug(`API base URL: ${ENV.apiUrl}`);

export const axiosClient: AxiosInstance = create({
  baseURL: ENV.apiUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);

  return config;
});

// Every rejection leaves as an ApiError, so callers handle one shape. Raw AxiosError never escapes.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    const canRefresh =
      error.response?.status === 401 && config && !config.skipAuthRefresh && !config.hasRetriedAuth;

    if (canRefresh) {
      config.hasRetriedAuth = true;

      try {
        const token = await refreshOnce();
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
          return axiosClient.request(config);
        }
      } catch {
        // Fall through: a failed refresh ends the session below.
      }
    }

    const apiError = ApiError.from(error);
    // No response at all: the address is wrong, the API is down or the network blocks it.
    if (apiError.kind === 'network' || apiError.kind === 'timeout') {
      logger.warn(`Cannot reach the API at ${ENV.apiUrl}` + (config?.url ?? ''));
    }
    if (apiError.kind === 'unauthorized' && !config?.skipAuthRefresh) onUnauthorized();

    return Promise.reject(apiError);
  },
);
