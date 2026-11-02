import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { AUDIT_OUTCOMES, type AuditOutcome } from '../audit_types';

// Append-only log of security and administrative actions (NFR-SEC-05, FR-AUTH-05, FR-IAM-06).
// Nothing updates or deletes these rows.
@Entity({ name: 'audit_events' })
@Index('idx_audit_events_target', ['targetType', 'targetId'])
export class AuditEvent extends BaseEntity {
  @Index('idx_audit_events_actor_executive_id')
  @Column({ type: 'uuid', name: 'actor_executive_id', nullable: true })
  actorExecutiveId: string | null;

  @Index('idx_audit_events_actor_platform_admin_id')
  @Column({ type: 'uuid', name: 'actor_platform_admin_id', nullable: true })
  actorPlatformAdminId: string | null;

  @Index('idx_audit_events_action')
  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'enum', enum: AUDIT_OUTCOMES, enumName: 'audit_outcome', default: 'success' })
  outcome: AuditOutcome;

  @Column({ type: 'varchar', length: 50, name: 'target_type', nullable: true })
  targetType: string | null;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId: string | null;

  @Column({ type: 'varchar', length: 64, name: 'request_id', nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;
}
