import type { PageParams } from '../../common/http/pagination';
import type { PeriodParams } from '../../common/http/period';
import type { BroadcastStatus } from '../broadcasts';
import type { WalletBalanceResponse } from '../credits';
import type { CreditTransactionType } from '../credits';
import type { AuditEventResponse, ListAuditEventsRequest } from '../audit';
import type { CreateExecutiveRequest, ExecutiveStatus, PlatformAdminStatus } from '../auth';
import type { OrganisationStatus, OrganisationType } from '../organisation';

export interface CreateOrganisationRequest {
  name: string;
  type: OrganisationType;
  description: string | null;
}

export interface ListOrganisationsRequest extends PageParams {
  search?: string;
  status?: OrganisationStatus;
  hasHead?: boolean;
  // Older name for hasHead, kept for the web app.
  hasChairman?: boolean;
}

export interface ListPlatformAdminsRequest extends PageParams {
  search?: string;
  status?: PlatformAdminStatus;
}

export interface ListOrganisationExecutivesRequest extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
  // The executive account of one member, when opening it from the member list.
  memberId?: string;
}

// The head's details; the organisation comes from the path.
export type AppointChairmanRequest = Omit<CreateExecutiveRequest, 'organisationId'>;

export interface UpdateOrganisationRequest {
  name?: string;
  // What this organisation calls its head: Head, Director, Manager…
  headTitle?: string;
  // null clears it.
  description?: string | null;
}

// The new head: an executive already in this organisation, or a person to promote or add.
export type ReplaceHeadRequest = { executiveId: string } | AppointChairmanRequest;

export const PLATFORM_NOTIFICATION_TYPES = [
  'purchase',
  'purchase_failed',
  'credits',
  'organisation',
  'organisation_suspended',
  'head',
  'admin',
  'security',
] as const;
export type PlatformNotificationType = (typeof PLATFORM_NOTIFICATION_TYPES)[number];

export interface ListPlatformNotificationsRequest extends PageParams {
  status?: 'unread' | 'read';
  search?: string;
}

export interface PlatformNotificationParams {
  notificationId: string;
}

// Built from the audit log for one admin: what others did that this admin may see.
export interface PlatformNotificationResponse {
  id: string;
  type: PlatformNotificationType;
  title: string;
  body: string;
  organisationId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface OrganisationParams {
  organisationId: string;
}

export interface OrganisationExecutiveParams extends OrganisationParams {
  executiveId: string;
}

export interface PlatformAdminParams {
  platformAdminId: string;
}

export interface OrganisationExecutiveResponse {
  id: string;
  memberId: string;
  memberNumber: string | null;
  // Old name for memberNumber, still read by the web app; drop once it switches.
  partyId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  // Titles of the positions they hold now, e.g. ["Constituency Organiser"].
  positions: string[];
  // Their own wallet; 0 until credits are allocated to them.
  creditBalance: number;
  lastSignInAt: Date | null;
  createdAt: Date;
}

export interface HeadResponse extends Omit<
  OrganisationExecutiveResponse,
  'positions' | 'creditBalance'
> {
  appointmentId: string;
  appointedAt: Date;
}

export interface OrganisationResponse {
  id: string;
  name: string;
  type: string;
  status: OrganisationStatus;
  description: string | null;
  logoUrl: string | null;
  credits: WalletBalanceResponse;
  headTitle: string;
  head: HeadResponse | null;
  memberCount: number;
  executiveCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformOverviewResponse {
  organisations: number;
  suspendedOrganisations: number;
  organisationsWithoutHead: number;
  members: number;
  activeHeads: number;
  activeExecutives: number;
  suspendedExecutives: number;
  platformAdmins: number;
  // Completed purchases only, all time; /platform/purchases/summary takes a period.
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}

export interface ListBroadcastsRequest extends PageParams, PeriodParams {
  organisationId?: string;
  status?: BroadcastStatus;
  search?: string;
}

export type ListOrganisationBroadcastsRequest = Omit<ListBroadcastsRequest, 'organisationId'>;

export interface ListPlatformPurchasesRequest extends PageParams, PeriodParams {
  organisationId?: string;
  status?: 'pending' | 'completed' | 'failed';
}

export type ListOrganisationCreditTransactionsRequest = PageParams & PeriodParams;

export interface ListPlatformCreditTransactionsRequest extends PageParams, PeriodParams {
  organisationId?: string;
  type?: CreditTransactionType;
}

export interface CreateCreditAdjustmentRequest {
  organisationId: string;
  amount: number;
  reason: string;
}

export interface PlatformImportLimits {
  maxFileSizeMb: number;
  maxRowsPerFile: number;
  allowedFileTypes: { csv: boolean; xlsx: boolean };
}

export interface PlatformNotificationPreferences {
  security: boolean;
  payments: boolean;
  service: boolean;
  digest: boolean;
}

export interface PlatformSettingsResponse {
  importLimits: PlatformImportLimits;
  notificationPreferences: PlatformNotificationPreferences;
}

export interface UpdatePlatformSettingsRequest {
  importLimits?: Partial<PlatformImportLimits>;
  notificationPreferences?: Partial<PlatformNotificationPreferences>;
}

export type PlatformAuditLogRequest = ListAuditEventsRequest;
export type PlatformAuditLogResponse = AuditEventResponse;

export interface PurchaseSummaryResponse {
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}
