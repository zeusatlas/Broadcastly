// Mirrors api/src/modules/chairman/chairman_types.ts. Change both together.

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
