// Public API of the approvals module — the broadcast approval workflow (FR-APR-01..06, BR-09).
// Other modules import from here only.
export { approvalsRouter } from './approvals_routes';
export { ApprovalDecision } from './entities/approval_decision_entity';
