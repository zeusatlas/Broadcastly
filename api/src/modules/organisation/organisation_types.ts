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
