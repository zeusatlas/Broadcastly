// Mirrors api/src/modules/platform/platform_types.ts. Change both sides together.
import type { PageParams } from '@/types/api';
import type { ExecutiveStatus } from '@/types/models';

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
  partyId: string | null;
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
  lastSignInAt: string | null;
  createdAt: string;
}

export interface ListOrganisationsParams extends PageParams {
  search?: string;
  status?: OrganisationStatus;
  hasChairman?: boolean;
}

export interface ListOrganisationExecutivesParams extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
}

export interface ListPlatformAdminsParams extends PageParams {
  search?: string;
  status?: PlatformAdminStatus;
}
