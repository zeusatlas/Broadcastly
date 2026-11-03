import type { PageParams } from '../../common/http/pagination';
import type { CreateExecutiveRequest, ExecutiveStatus, Permission } from '../auth';
import type { UnitStatus } from '../organisation';

export interface CreatePositionRequest {
  title: string;
  // "organisation" for an organisation-wide office, otherwise the unit type it sits in.
  unitType: string;
}

export interface UpdatePositionRequest {
  title?: string;
  isActive?: boolean;
}

export interface ListUnitsRequest extends PageParams {
  parentId?: string;
  search?: string;
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

export interface CreateOrganisationExecutiveRequest
  extends Omit<CreateExecutiveRequest, 'organisationId'>, AppointmentRequest {}

export interface EndAppointmentRequest {
  reason?: string;
}

export interface ListExecutivesRequest extends PageParams {
  search?: string;
  status?: ExecutiveStatus;
}

export interface PositionParams {
  positionId: string;
}

export interface ExecutiveParams {
  executiveId: string;
}

export interface AppointmentParams {
  appointmentId: string;
}

export interface UnitTypeCount {
  type: string;
  count: number;
}

export interface OrganisationOverviewResponse {
  // Members are not placed in units yet, so only organisation-wide callers get the total.
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
  status: UnitStatus;
  childCount: number;
}

export interface ExecutiveAppointmentResponse {
  id: string;
  positionId: string;
  positionTitle: string;
  unitId: string | null;
  unitName: string | null;
  permissions: Permission[];
  effectiveFrom: Date;
}

export interface ExecutiveResponse {
  id: string;
  memberId: string;
  partyId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: ExecutiveStatus;
  appointments: ExecutiveAppointmentResponse[];
  lastSignInAt: Date | null;
  createdAt: Date;
}
