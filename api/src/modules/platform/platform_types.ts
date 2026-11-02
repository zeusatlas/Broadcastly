import type { PageParams } from '../../common/http/pagination';
import type { CreateExecutiveRequest, ExecutiveStatus, PlatformAdminStatus } from '../auth';
import type { OrganisationStatus } from '../organisation';

export interface CreateOrganisationRequest {
  name: string;
  type: string;
}

export interface ListOrganisationsRequest extends PageParams {
  search?: string;
  status?: OrganisationStatus;
  hasChairman?: boolean;
}

export interface ListPlatformAdminsRequest extends PageParams {
  search?: string;
  status?: PlatformAdminStatus;
}

export interface ListOrganisationExecutivesRequest extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
}

// The chairman's details; the organisation comes from the path.
export type AppointChairmanRequest = Omit<CreateExecutiveRequest, 'organisationId'>;

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
  partyId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  // Titles of the positions they hold now, e.g. ["Constituency Organiser"].
  positions: string[];
  lastSignInAt: Date | null;
  createdAt: Date;
}

export interface ChairmanResponse extends Omit<OrganisationExecutiveResponse, 'positions'> {
  appointmentId: string;
  appointedAt: Date;
}

export interface OrganisationResponse {
  id: string;
  name: string;
  type: string;
  status: OrganisationStatus;
  chairman: ChairmanResponse | null;
  memberCount: number;
  executiveCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformOverviewResponse {
  organisations: number;
  organisationsWithoutChairman: number;
  members: number;
  activeChairmen: number;
  activeExecutives: number;
  suspendedExecutives: number;
  platformAdmins: number;
}
