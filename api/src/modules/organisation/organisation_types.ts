// 'suspended': a platform admin stopped it; none of its executives can sign in until reactivated.
export const ORGANISATION_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type OrganisationStatus = (typeof ORGANISATION_STATUSES)[number];

export const UNIT_STATUSES = ['active', 'inactive'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const APPOINTMENT_STATUSES = ['active', 'ended', 'revoked'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// Created by migration, so code refers to the office by id, never by its title.
export const CHAIRMAN_POSITION_ID = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21';

export interface OrganisationRef {
  id: string;
  name: string;
  type: string;
  logoUrl: string | null;
}

export interface AppointmentSummaryResponse {
  id: string;
  positionTitle: string;
  organisationId: string;
  organisationName: string;
  // Null for organisation-wide offices such as chairman.
  unitId: string | null;
  unitName: string | null;
  unitType: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

// What a member's current appointments give them. Read by the auth module on every request.
export interface ActiveAccess {
  hasActiveAppointment: boolean;
  holdsChairman: boolean;
  // Holds an appointment with no unit, so their reach is the whole organisation.
  organisationWide: boolean;
  grantedPermissions: string[];
  scopeUnitIds: string[];
  appointments: AppointmentSummaryResponse[];
}

export interface AccessIncludes {
  scope?: boolean;
  appointments?: boolean;
}

export interface CreateAppointmentInput {
  memberId: string;
  positionId: string;
  organisationId: string;
  unitId: string | null;
  appointedByExecutiveId: string | null;
}

export interface PositionRecord {
  id: string;
  organisationId: string | null;
  title: string;
  unitType: string;
  isActive: boolean;
}

export interface UnitRecord {
  id: string;
  organisationId: string;
  parentId: string | null;
  type: string;
  name: string;
  status: UnitStatus;
}

export interface AppointmentRecord {
  id: string;
  memberId: string;
  organisationId: string;
  positionId: string;
  unitId: string | null;
  status: AppointmentStatus;
}
