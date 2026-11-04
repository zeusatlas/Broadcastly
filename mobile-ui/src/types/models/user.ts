// Mirrors the backend's UserResponse (api/src/modules/auth/auth_types.ts). Change both together.

// Routes the user: admin tools, or the executive app. A chairman holds the chairman office;
// every executive's actual offices are their appointments' positions.
export type UserRole = 'platform_admin' | 'chairman' | 'executive';

export type ExecutiveStatus = 'invited' | 'active' | 'suspended' | 'deactivated';

export type OrganisationalUnitType = 'electoral_area' | 'branch' | 'polling_station';

export interface OrganisationRef {
  id: string;
  name: string;
  type: string;
  logoUrl: string | null;
}

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
  | 'credit.purchase'
  | 'appointment.manage';

export interface Appointment {
  id: string;
  // Configurable per FR-ORG-08 — never branch on this string.
  positionTitle: string;
  organisationId: string;
  organisationName: string;
  // Null for organisation-wide offices such as chairman.
  unitId: string | null;
  unitName: string | null;
  unitType: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// Any signed-in account. Platform admins have no member, organisation or appointments.
export interface User {
  id: string;
  memberId: string | null;
  partyId: string | null;
  organisation: OrganisationRef | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  role: UserRole;
  status: ExecutiveStatus;
  permissions: Permission[];
  appointments: Appointment[];
  lastSignInAt: string | null;
  createdAt: string;
  updatedAt: string;
}
