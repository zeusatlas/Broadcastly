import type { PageParams } from '../../common/http/pagination';
import type { CreateExecutiveRequest, ExecutiveStatus, UserRole } from '../auth';
import type { UnitStatus } from '../organisation';

// ── Requests ────────────────────────────────────────────────────────────────

export interface CreateConstituencyRequest {
  name: string;
}

export interface ListConstituenciesRequest extends PageParams {
  search?: string;
}

// The person's details; the role is fixed by the endpoint (chairman or platform admin).
export type NewExecutiveRequest = Omit<CreateExecutiveRequest, 'role'>;

export interface ConstituencyParams {
  constituencyId: string;
}

export interface ExecutiveParams {
  executiveId: string;
}

// ── Responses (the `data` of the envelope) ──────────────────────────────────

export interface ExecutiveSummaryResponse {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: ExecutiveStatus;
  lastSignInAt: Date | null;
  createdAt: Date;
}

export interface ChairmanResponse extends ExecutiveSummaryResponse {
  appointmentId: string;
  appointedAt: Date;
}

export interface ConstituencyResponse {
  id: string;
  name: string;
  status: UnitStatus;
  chairman: ChairmanResponse | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformOverviewResponse {
  constituencies: number;
  constituenciesWithoutChairman: number;
  activeChairmen: number;
  activeExecutives: number;
  platformAdmins: number;
}
