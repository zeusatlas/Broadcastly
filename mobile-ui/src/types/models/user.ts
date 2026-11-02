// Mirrors the backend's UserResponse (api/src/modules/auth/auth_types.ts). Change both together.

export type UserRole =
  | 'platform_admin'
  | 'constituency_chairman'
  | 'constituency_executive'
  | 'area_executive'
  | 'polling_station_executive';

export type ExecutiveStatus = 'invited' | 'active' | 'suspended' | 'deactivated';

export type OrganisationalUnitType =
  'constituency' | 'electoral_area' | 'branch' | 'polling_station';

export interface OrganisationalUnit {
  id: string;
  type: OrganisationalUnitType;
  name: string;
  parentId: string | null;
}

export type Permission =
  | 'broadcast.draft'
  | 'broadcast.submit'
  | 'broadcast.send'
  | 'broadcast.select_recipients'
  | 'broadcast.approve'
  | 'report.view'
  | 'member.manage'
  | 'member.import'
  | 'credit.allocate'
  | 'appointment.manage';

export interface Appointment {
  id: string;
  // Configurable per FR-ORG-08 — never branch on this string.
  positionTitle: string;
  unitId: string;
  unitName: string;
  unitType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// The signed-in executive: an appointed member with a login.
export interface User {
  id: string;
  memberId: string;
  // Party membership number, where the party issues one.
  partyId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  // 'YYYY-MM-DD'
  dateOfBirth: string | null;
  role: UserRole;
  status: ExecutiveStatus;
  permissions: Permission[];
  appointments: Appointment[];
  lastSignInAt: string | null;
  createdAt: string;
  updatedAt: string;
}
