// Public API of the audit module — append-only log of sensitive actions (NFR-SEC-05, FR-IAM-06, FR-AUTH-05).
// Other modules import from here only.
export { auditService } from './audit_service';
export { AUDIT_ACTIONS, type AuditAction, type AuditEventInput } from './audit_types';
