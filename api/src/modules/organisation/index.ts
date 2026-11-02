// Public API of the organisation module — units, positions, appointments and grants (FR-ORG-01..08, FR-IAM-04).
// Other modules import from here only.
export { organisationService } from './organisation_service';
export type {
  AccessIncludes,
  ActiveAccess,
  AppointmentSummaryResponse,
} from './organisation_types';
