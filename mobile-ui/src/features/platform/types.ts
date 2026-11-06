import type { OrganisationType } from './utils/organisation_types';
// Mirrors api/src/modules/platform/platform_types.ts. Change both sides together.
import type { PageParams } from '@/types/api';
import type { BroadcastStatus } from '@/features/broadcasts';
import type { ExecutiveStatus, PlatformPermission } from '@/types/models';

export type OrganisationStatus = 'active' | 'inactive' | 'suspended';
export type PlatformAdminStatus = 'active' | 'suspended';

export interface PlatformOverviewResponse {
  organisations: number;
  suspendedOrganisations: number;
  organisationsWithoutHead: number;
  members: number;
  activeHeads: number;
  activeExecutives: number;
  suspendedExecutives: number;
  platformAdmins: number;
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}

export interface WalletBalanceResponse {
  balance: number;
  reserved: number;
  available: number;
}

export interface OrganisationExecutiveResponse {
  id: string;
  memberId: string;
  memberNumber: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  // Titles of the positions they hold now, e.g. ["Constituency Organiser"].
  positions: string[];
  creditBalance: number;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface HeadResponse extends Omit<
  OrganisationExecutiveResponse,
  'positions' | 'creditBalance'
> {
  appointmentId: string;
  appointedAt: string;
}

export interface OrganisationResponse {
  id: string;
  name: string;
  type: string;
  status: OrganisationStatus;
  logoUrl: string | null;
  credits: WalletBalanceResponse;
  headTitle: string;
  description: string | null;
  head: HeadResponse | null;
  memberCount: number;
  executiveCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAdminResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  status: PlatformAdminStatus;
  // The main admin: holds every permission and cannot be limited or suspended by other admins.
  isSuperAdmin: boolean;
  permissions: PlatformPermission[];
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CreateOrganisationRequest {
  name: string;
  type: OrganisationType;
  description: string | null;
}

export interface AppointHeadRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  memberNumber?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface CreatePlatformAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  permissions: PlatformPermission[];
}

export interface UpdatePlatformAdminPermissionsRequest {
  permissions: PlatformPermission[];
}

export interface ListOrganisationsParams extends PageParams {
  search?: string;
  status?: OrganisationStatus;
  hasHead?: boolean;
}

export interface ListOrganisationExecutivesParams extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
}

export interface ListPlatformAdminsParams extends PageParams {
  search?: string;
  status?: PlatformAdminStatus;
}

export type PlatformPeriod =
  'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_365_days' | 'all_time';

interface PeriodParams {
  period?: PlatformPeriod;
}

export type PurchaseStatus = 'pending' | 'completed' | 'failed';

export interface PlatformPurchaseResponse {
  id: string;
  organisationId: string;
  organisationName: string;
  reference: string;
  credits: number;
  amountPesewas: number;
  currency: 'GHS';
  status: PurchaseStatus;
  provider: string;
  failureReason: string | null;
  initiatedBy: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface PurchaseSummaryResponse {
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}

export interface ListPlatformPurchasesParams extends PageParams, PeriodParams {
  organisationId?: string;
  status?: PurchaseStatus;
}

export type PlatformCreditTransactionType =
  | 'purchase'
  | 'allocation_in'
  | 'allocation_out'
  | 'reservation'
  | 'release'
  | 'consumption'
  | 'refund'
  | 'reversal'
  | 'adjustment';

export interface PlatformCreditTransactionResponse {
  id: string;
  type: PlatformCreditTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  initiatedBy: string | null;
  walletOwner: string | null;
  organisationId: string;
  organisationName: string;
  createdAt: string;
}

export interface ListPlatformCreditTransactionsParams extends PageParams, PeriodParams {
  organisationId?: string;
  type?: PlatformCreditTransactionType;
}

export interface CreateCreditAdjustmentRequest {
  organisationId: string;
  // Positive adds credits to the organisation head's account, negative removes them.
  amount: number;
  reason: string;
}

export interface ListPlatformBroadcastsParams extends PageParams, PeriodParams {
  organisationId?: string;
  status?: BroadcastStatus;
  search?: string;
}

export interface AuditEventResponse {
  id: string;
  actor: string | null;
  actorRole: 'executive' | 'platform_admin' | null;
  action: string;
  outcome: 'success' | 'failure';
  organisationId: string | null;
  organisationName: string | null;
  targetType: string | null;
  createdAt: string;
}

export interface ListAuditLogParams extends PageParams, PeriodParams {
  actor?: string;
  action?: string;
  organisationId?: string;
}

export interface PlatformSettingsResponse {
  importLimits: {
    maxFileSizeMb: number;
    maxRowsPerFile: number;
    allowedFileTypes: { csv: boolean; xlsx: boolean };
  };
  notificationPreferences: {
    security: boolean;
    payments: boolean;
    service: boolean;
    digest: boolean;
  };
}

export interface UpdatePlatformSettingsRequest {
  importLimits?: Partial<PlatformSettingsResponse['importLimits']>;
  notificationPreferences?: Partial<PlatformSettingsResponse['notificationPreferences']>;
}

export interface PlatformBroadcastResponse {
  id: string;
  organisationId: string;
  organisationName: string;
  title: string | null;
  status: BroadcastStatus;
  audienceSummary: string | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCredits: number;
  createdBy: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface UpdateOrganisationRequest {
  name?: string;
  // What this organisation calls its head: Head, Director, Manager…
  headTitle?: string;
  // null clears it.
  description?: string | null;
}

// The new head: an executive already in this organisation, or a person to promote or add.
export type ReplaceHeadRequest = { executiveId: string } | AppointHeadRequest;

export type PlatformNotificationType =
  | 'purchase'
  | 'purchase_failed'
  | 'credits'
  | 'organisation'
  | 'organisation_suspended'
  | 'head'
  | 'admin'
  | 'security';

export interface PlatformNotificationResponse {
  id: string;
  type: PlatformNotificationType;
  title: string;
  body: string;
  organisationId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ListPlatformNotificationsParams extends PageParams {
  status?: 'unread' | 'read';
  search?: string;
}
