// Public API of the organisation module — organisations (tenants), their units, positions,
// appointments and grants (FR-ORG-01..08, FR-IAM-04). Other modules import from here only.
export { Organisation } from './entities/organisation_entity';
export { organisationService } from './organisation_service';
export {
  CHAIRMAN_POSITION_ID,
  ORGANISATION_STATUSES,
  UNIT_STATUSES,
  type AccessIncludes,
  type AppointmentRecord,
  type PositionRecord,
  type UnitRecord,
  type UnitStatus,
  type ActiveAccess,
  type AppointmentSummaryResponse,
  type OrganisationRef,
  type OrganisationStatus,
} from './organisation_types';
