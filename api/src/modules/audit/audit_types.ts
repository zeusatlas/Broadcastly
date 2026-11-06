export const AUDIT_OUTCOMES = ['success', 'failure'] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

// Stable identifiers stored in the log. Add new ones here; never rename an existing one.
export const AUDIT_ACTIONS = {
  signIn: 'auth.sign_in',
  signInFailed: 'auth.sign_in_failed',
  accountLocked: 'auth.account_locked',
  otpSent: 'auth.otp_sent',
  otpFailed: 'auth.otp_failed',
  signOut: 'auth.sign_out',
  signOutAll: 'auth.sign_out_all',
  refreshTokenReused: 'auth.refresh_token_reused',
  executiveCreated: 'executive.created',
  executiveSuspended: 'executive.suspended',
  executiveReactivated: 'executive.reactivated',
  constituencyCreated: 'organisation.constituency_created',
  organisationCreated: 'organisation.created',
  organisationUpdated: 'organisation.updated',
  headReplaced: 'organisation.head_replaced',
  positionCreated: 'organisation.position_created',
  positionUpdated: 'organisation.position_updated',
  unitCreated: 'organisation.unit_created',
  appointmentEnded: 'organisation.appointment_ended',
  appointmentCreated: 'organisation.appointment_created',
  platformAdminCreated: 'platform_admin.created',
  platformAdminSuspended: 'platform_admin.suspended',
  platformAdminReactivated: 'platform_admin.reactivated',
  platformAdminPermissionsChanged: 'platform_admin.permissions_changed',
  organisationSuspended: 'organisation.suspended',
  organisationReactivated: 'organisation.reactivated',
  organisationLogoUpdated: 'organisation.logo_updated',
  organisationLogoRemoved: 'organisation.logo_removed',
  creditPurchaseStarted: 'credit.purchase_started',
  creditPurchaseCompleted: 'credit.purchase_completed',
  creditPurchaseFailed: 'credit.purchase_failed',
  creditAdjusted: 'credit.adjusted',
  creditAllocated: 'credit.allocated',
  platformSettingsUpdated: 'platform.settings_updated',
  organisationOpened: 'platform.organisation_opened',
  organisationNotificationPreferencesUpdated: 'organisation.notification_preferences_updated',
  broadcastDraftCreated: 'broadcast.draft_created',
  broadcastDraftUpdated: 'broadcast.draft_updated',
  broadcastSubmitted: 'broadcast.submitted',
  broadcastDispatched: 'broadcast.dispatched',
  broadcastCancelled: 'broadcast.cancelled',
  broadcastApproved: 'broadcast.approved',
  broadcastRejected: 'broadcast.rejected',
  reportExported: 'report.exported',
  memberCreated: 'member.created',
  memberUpdated: 'member.updated',
  memberDeactivated: 'member.deactivated',
  memberReactivated: 'member.reactivated',
  memberImportStarted: 'member.import_started',
  memberImportConfirmed: 'member.import_confirmed',
  memberImportCancelled: 'member.import_cancelled',
  templateCreated: 'template.created',
  templateUpdated: 'template.updated',
  templateArchived: 'template.archived',
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditEventInput {
  action: AuditAction;
  outcome?: AuditOutcome;
  actorExecutiveId?: string | null;
  actorPlatformAdminId?: string | null;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  ipAddress?: string;
  // Never put names, phone numbers, emails, passwords or tokens in here (NFR-PRIV-01).
  metadata?: Record<string, unknown>;
}

import type { PageParams } from '../../common/http/pagination';
import type { PeriodParams } from '../../common/http/period';

export interface ListAuditEventsRequest extends PageParams, PeriodParams {
  actor?: string;
  action?: string;
  organisationId?: string;
}

export interface AuditEventResponse {
  id: string;
  actor: string | null;
  actorRole: 'executive' | 'platform_admin' | null;
  action: string;
  outcome: AuditOutcome;
  organisationId: string | null;
  organisationName: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
