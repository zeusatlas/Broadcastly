export const UNIT_STATUSES = ['active', 'inactive'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const APPOINTMENT_STATUSES = ['active', 'ended', 'revoked'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface AppointmentSummaryResponse {
  id: string;
  positionTitle: string;
  unitId: string;
  unitName: string;
  unitType: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

// What a member's current appointments give them. Read by the auth module on every request.
export interface ActiveAccess {
  hasActiveAppointment: boolean;
  grantedPermissions: string[];
  // Empty unless requested with AccessIncludes.
  scopeUnitIds: string[];
  appointments: AppointmentSummaryResponse[];
}

// Opt in to the costlier parts, so callers never compute what they do not use.
export interface AccessIncludes {
  scope?: boolean;
  appointments?: boolean;
}

// Top-level unit type. Each constituency is the root of its own tree (FR-ORG-01).
export const CONSTITUENCY_UNIT_TYPE = 'constituency';

// Created by migration PlatformAdministration, so code refers to the office by id, never by title.
export const CONSTITUENCY_CHAIRMAN_POSITION_ID = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21';

export interface UnitSummary {
  id: string;
  type: string;
  status: UnitStatus;
}

export interface CreateAppointmentInput {
  memberId: string;
  positionId: string;
  unitId: string;
  appointedByExecutiveId: string | null;
}
