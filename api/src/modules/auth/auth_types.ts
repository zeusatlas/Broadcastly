import type { AppointmentSummaryResponse } from '../organisation';

// Same strings as the app's Permission union (mobile-ui/src/types/models/user.ts).
// FR-IAM-02 lists these; extend both sides together.
export const PERMISSIONS = [
  'broadcast.draft',
  'broadcast.submit',
  'broadcast.send',
  'broadcast.select_recipients',
  'broadcast.approve',
  'report.view',
  'member.manage',
  'member.import',
  'credit.allocate',
  'appointment.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const USER_ROLES = [
  'platform_admin',
  'constituency_chairman',
  'constituency_executive',
  'area_executive',
  'polling_station_executive',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Permissions a role brings while the executive holds an active appointment (SRS 3.1).
// Everyone else gets permissions granted on their appointments. Platform admins use role checks.
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  platform_admin: [],
  constituency_chairman: PERMISSIONS,
  constituency_executive: [],
  area_executive: [],
  polling_station_executive: [],
};

export const EXECUTIVE_STATUSES = ['invited', 'active', 'suspended', 'deactivated'] as const;
export type ExecutiveStatus = (typeof EXECUTIVE_STATUSES)[number];

export const SESSION_REVOKE_REASONS = [
  'sign_out',
  'sign_out_all',
  'refresh_token_reused',
  'account_inactive',
] as const;
export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[number];

export interface AccessTokenClaims {
  sub: string;
  sid: string;
}

// Who is calling and what they may touch, resolved fresh on every request so a revoked
// appointment takes effect immediately (BR-05). Permissions are never read from the token.
export interface AccessContext {
  executiveId: string;
  memberId: string;
  sessionId: string;
  role: UserRole;
  permissions: ReadonlySet<Permission>;
  // Units the caller may access, including subordinate units (FR-IAM-03).
  scopeUnitIds: readonly string[];
}

// ── Requests ────────────────────────────────────────────────────────────────

// Step 1 of sign-in. The phone number takes the place of a password; the SMS code proves it.
export interface SignInRequest {
  email: string;
  phone: string;
}

export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
}

export interface ResendOtpRequest {
  challengeId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface SignOutRequest {
  allDevices?: boolean;
}

export interface CreateExecutiveRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  partyId?: string;
  email: string;
  phone: string;
  // 'YYYY-MM-DD'
  dateOfBirth: string;
  role: UserRole;
}

// ── Responses (the `data` of the envelope) ──────────────────────────────────

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  // Seconds until the access token expires.
  expiresIn: number;
  // When the whole session ends (SESSION_TTL_HOURS after sign-in); refreshing does not move it.
  sessionExpiresAt: Date;
}

export interface UserResponse {
  id: string;
  memberId: string;
  partyId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  role: UserRole;
  status: ExecutiveStatus;
  permissions: Permission[];
  appointments: AppointmentSummaryResponse[];
  lastSignInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Returned when a code is sent (sign-in and resend).
export interface OtpChallengeResponse {
  challengeId: string;
  maskedPhone: string;
  // Seconds until the code expires, and until another code may be requested.
  expiresIn: number;
  resendIn: number;
}

export interface SignInResponse {
  user: UserResponse;
  tokens: AuthTokensResponse;
}
