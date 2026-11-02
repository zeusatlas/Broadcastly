// Public API of the organisation module — units, positions, appointments and grants (FR-ORG-01..08, FR-IAM-04).
// Other modules import from here only.
export { organisationService } from './organisation_service';
export {
  CONSTITUENCY_CHAIRMAN_POSITION_ID,
  CONSTITUENCY_UNIT_TYPE,
  UNIT_STATUSES,
  type AccessIncludes,
  type ActiveAccess,
  type AppointmentSummaryResponse,
  type UnitStatus,
} from './organisation_types';
