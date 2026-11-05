import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { APPROVAL_DECISIONS, type ApprovalDecisionValue } from '../approvals_types';

// Approver, decision, reason and time for one broadcast (FR-APR-03, FR-APR-05). Append-only:
// a rejected broadcast returns to draft, so one broadcast can collect several decisions.
@Entity({ name: 'approval_decisions' })
@Index('idx_approval_decisions_broadcast', ['broadcastId', 'createdAt'])
@Index('idx_approval_decisions_organisation', ['organisationId', 'createdAt'])
export class ApprovalDecision extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'broadcast_id' })
  broadcastId: string;

  @Column({ type: 'uuid', name: 'decided_by_executive_id' })
  decidedByExecutiveId: string;

  @Column({ type: 'enum', enum: APPROVAL_DECISIONS, enumName: 'approval_decision' })
  decision: ApprovalDecisionValue;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;
}
