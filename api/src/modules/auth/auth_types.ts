import type { RequestContext } from '../../common/http/request_context';
import type { AppointmentSummaryResponse, OrganisationRef } from '../organisation';

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
  'credit.purchase',
  'appointment.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// What sign-in and /auth/me report, so each app can route the user to the right dashboard.
// Derived, not stored: `chairman` holds the chairman office; an executive's offices are positions.
export const USER_ROLES = ['platform_admin', 'chairman', 'executive'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EXECUTIVE_STATUSES = ['invited', 'active', 'suspended', 'deactivated'] as const;
export type ExecutiveStatus = (typeof EXECUTIVE_STATUSES)[number];

export const PLATFORM_ADMIN_STATUSES = ['active', 'suspended'] as const;
export type PlatformAdminStatus = (typeof PLATFORM_ADMIN_STATUSES)[number];

export const ACCOUNT_KINDS = ['executive', 'platform_admin'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

// The web app is for platform admins only; the mobile app is for everyone.
export const SIGN_IN_CLIENTS = ['mobile', 'web'] as const;
export type SignInClient = (typeof SIGN_IN_CLIENTS)[number];

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
  kind: AccountKind;
  accountId: string;
  sessionId: string;
  role: UserRole;
  memberId: string | null;
  organisationId: string | null;
  organisationWide: boolean;
  permissions: ReadonlySet<Permission>;
  scopeUnitIds: readonly string[];
}

export interface SignInRequest {
  email: string;
  phone: string;
  client?: SignInClient;
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
  organisationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  partyId?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface CreatePlatformAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface ActionActor {
  executiveId?: string | null;
  platformAdminId?: string | null;
  context?: RequestContext;
}

export const MANAGEABLE_STATUSES = ['active', 'suspended'] as const;
export type ManageableStatus = (typeof MANAGEABLE_STATUSES)[number];

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  sessionExpiresAt: Date;
}

// One shape for every signed-in user. Platform admins have no member, organisation or appointments.
export interface UserResponse {
  id: string;
  role: UserRole;
  status: ExecutiveStatus | PlatformAdminStatus;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  memberId: string | null;
  partyId: string | null;
  dateOfBirth: string | null;
  organisation: OrganisationRef | null;
  permissions: Permission[];
  appointments: AppointmentSummaryResponse[];
  lastSignInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpChallengeResponse {
  challengeId: string;
  maskedPhone: string;
  expiresIn: number;
  resendIn: number;
}

export interface SignInResponse {
  user: UserResponse;
  tokens: AuthTokensResponse;
}

export interface PlatformAdminResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  status: PlatformAdminStatus;
  lastSignInAt: Date | null;
  createdAt: Date;
}
