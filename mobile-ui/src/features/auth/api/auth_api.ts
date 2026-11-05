import { http, type RequestOptions } from '@/lib/api';
import type { User } from '@/types/models';

import type {
  AuthTokensResponse,
  OtpChallengeResponse,
  RefreshTokenRequest,
  ResendOtpRequest,
  SignInRequest,
  SignInResponse,
  SessionResponse,
  SignOutRequest,
  VerifyOtpRequest,
} from '../types';

const ENDPOINTS = {
  signIn: '/auth/login',
  verifyOtp: '/auth/verify-otp',
  resendOtp: '/auth/resend-otp',
  signOut: '/auth/logout',
  refresh: '/auth/refresh',
  me: '/auth/me',
  sessions: '/auth/sessions',
} as const;

// skipAuthRefresh on the sign-in calls: their 401 means "wrong details or code", not an expired
// session, so the client must not try to refresh and replay them.
const PUBLIC = { skipAuthRefresh: true } as const;

// Each call resolves to ApiResponse<T>: { status, status_code, message, data: T }.
// One argument per endpoint (credentials, params or { uuid, credentials }), then optional options.
export const authEndpoints = {
  signIn: (credentials: SignInRequest) =>
    http.post<OtpChallengeResponse, SignInRequest>(ENDPOINTS.signIn, credentials, PUBLIC),

  verifyOtp: (credentials: VerifyOtpRequest) =>
    http.post<SignInResponse, VerifyOtpRequest>(ENDPOINTS.verifyOtp, credentials, PUBLIC),

  resendOtp: (credentials: ResendOtpRequest) =>
    http.post<OtpChallengeResponse, ResendOtpRequest>(ENDPOINTS.resendOtp, credentials, PUBLIC),

  // Not PUBLIC: if the access token has expired, the client refreshes and replays, so the server
  // really revokes the session instead of leaving it alive. No `data` in the response.
  signOut: (credentials: SignOutRequest) =>
    http.post<undefined, SignOutRequest>(ENDPOINTS.signOut, credentials),

  refresh: (credentials: RefreshTokenRequest) =>
    http.post<AuthTokensResponse, RefreshTokenRequest>(ENDPOINTS.refresh, credentials, PUBLIC),

  getCurrentUser: (options?: RequestOptions) => http.get<User>(ENDPOINTS.me, options),

  readSessions: (options?: RequestOptions) =>
    http.get<SessionResponse[]>(ENDPOINTS.sessions, options),

  revokeSession: ({ sessionId }: { sessionId: string }) =>
    http.delete(`${ENDPOINTS.sessions}/${sessionId}`),
};
