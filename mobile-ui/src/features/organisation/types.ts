import type { PageParams, Paginated } from '@/types/api';
import type { Permission, ExecutiveStatus } from '@/types/models';

export interface UnitTypeCount {
  type: string;
  count: number;
}

export interface OrganisationOverviewResponse {
  // Null unless the caller is organisation-wide: members are not placed in units yet.
  members: number | null;
  activeExecutives: number;
  suspendedExecutives: number;
  positions: number;
  units: number;
  unitsByType: UnitTypeCount[];
}

export interface PositionResponse {
  id: string;
  title: string;
  // "organisation" for an organisation-wide office, otherwise the unit type it sits in.
  unitType: string;
  isActive: boolean;
  isBuiltIn: boolean;
  holderCount: number;
}

export interface UnitResponse {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  status: 'active' | 'inactive';
  childCount: number;
}

export interface ExecutiveAppointmentResponse {
  id: string;
  positionId: string;
  positionTitle: string;
  unitId: string | null;
  unitName: string | null;
  permissions: Permission[];
  effectiveFrom: string;
}

export interface ExecutiveResponse {
  id: string;
  memberId: string;
  memberNumber: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  appointments: ExecutiveAppointmentResponse[];
  lastSignInAt: string | null;
  createdAt: string;
}

export interface ListUnitsParams extends PageParams {
  parentId?: string;
  search?: string;
}

export interface ListExecutivesParams extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
}

export interface CreatePositionRequest {
  title: string;
  unitType?: string;
}

export interface UpdatePositionRequest {
  title?: string;
  isActive?: boolean;
}

export interface CreateUnitRequest {
  name: string;
  type: string;
  parentId?: string;
}

export interface AppointmentRequest {
  positionId: string;
  unitId?: string;
  permissions: Permission[];
}

export interface CreateExecutiveRequest extends AppointmentRequest {
  memberNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface EndAppointmentRequest {
  reason?: string;
}

export type OrganisationUnitsResponse = Paginated<UnitResponse>;
export type OrganisationExecutivesResponse = Paginated<ExecutiveResponse>;

export interface OrganisationLogoResponse {
  logoUrl: string | null;
}
