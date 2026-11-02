import type { User } from '@/types/models';

// Mirrors server/src/modules/auth/auth_types.ts. Change both sides together.
// <Name>Request is what we send; <Name>Response is the `data` inside ApiResponse<T>.

/** Step 1: email and phone identify the executive; an SMS code is sent to that phone. */
export interface SignInRequest {
  email: string;
  phone: string;
}

/** Returned when a code is sent (sign-in and resend). */
export interface OtpChallengeResponse {
  challengeId: string;
  /** e.g. '+233 •• ••• 4567' */
  maskedPhone: string;
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds until another code may be requested. */
  resendIn: number;
}

/** Step 2: the code from the SMS. */
export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
}

export interface ResendOtpRequest {
  challengeId: string;
}

export interface SignInResponse {
  user: User;
  tokens: AuthTokensResponse;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Seconds until the access token expires. */
  expiresIn: number;
  /** ISO time the whole session ends (24 h after sign-in); refreshing does not move it. */
  sessionExpiresAt: string;
}

export interface SignOutRequest {
  /** true signs out every device. */
  allDevices?: boolean;
}

export type SessionStatus = 'restoring' | 'signed_out' | 'signed_in';

/** Why the last session ended, when the user did not choose to sign out. */
export type SessionEndReason = 'expired';

/** A sent code waiting to be verified. Times are epoch milliseconds on this device. */
export interface PendingChallenge {
  challengeId: string;
  maskedPhone: string;
  codeExpiresAt: number;
  resendAvailableAt: number;
}
