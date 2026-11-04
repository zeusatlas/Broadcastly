import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { OrganisationExecutive } from '../../auth';
import { Organisation } from '../../organisation';
import { BROADCAST_STATUSES, type BroadcastStatus } from '../broadcasts_types';

// One SMS broadcast: who wrote it, the message, who it targets, its schedule, estimate and outcome
// (FR-SMS-12, FR-SMS-13, FR-REP-04). Counts are cached here; per-number detail lives in recipients.
@Entity({ name: 'broadcasts' })
@Index('idx_broadcasts_organisation_created', ['organisationId', 'createdAt'])
@Index('idx_broadcasts_status_created', ['status', 'createdAt'])
export class Broadcast extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'uuid', name: 'created_by_executive_id' })
  createdByExecutiveId: string;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_executive_id' })
  createdByExecutive?: OrganisationExecutive;

  // Short label the app lists broadcasts by; the SMS itself is `message`.
  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: BROADCAST_STATUSES,
    enumName: 'broadcast_status',
    default: 'draft',
  })
  status: BroadcastStatus;

  // The recipient selection as chosen (units, groups), kept for the record (FR-SMS-13).
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  audience: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, name: 'audience_summary', nullable: true })
  audienceSummary: string | null;

  @Column({ type: 'integer', name: 'recipient_count', default: 0 })
  recipientCount: number;

  @Column({ type: 'integer', name: 'segment_count', default: 0 })
  segmentCount: number;

  @Column({ type: 'integer', name: 'estimated_credits', default: 0 })
  estimatedCredits: number;

  @Column({ type: 'integer', name: 'delivered_count', default: 0 })
  deliveredCount: number;

  @Column({ type: 'integer', name: 'failed_count', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamptz', name: 'scheduled_at', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
