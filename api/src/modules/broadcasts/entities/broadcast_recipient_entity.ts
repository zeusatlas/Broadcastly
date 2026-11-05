import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { RECIPIENT_STATUSES, type RecipientStatus } from '../broadcasts_types';

// One number in one broadcast: the number as it was when sent, the provider's reference and the
// delivery state it reported (FR-REP-02). Delivered never means read (BR-12).
@Entity({ name: 'broadcast_recipients' })
@Index('uq_broadcast_recipients_phone', ['broadcastId', 'phone'], { unique: true })
@Index('idx_broadcast_recipients_status', ['broadcastId', 'status'])
@Index('uq_broadcast_recipients_provider_ref', ['providerReference'], {
  unique: true,
  where: `"provider_reference" IS NOT NULL`,
})
export class BroadcastRecipient extends BaseEntity {
  @Column({ type: 'uuid', name: 'broadcast_id' })
  broadcastId: string;

  @Column({ type: 'uuid', name: 'member_id', nullable: true })
  memberId: string | null;

  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @Column({
    type: 'enum',
    enum: RECIPIENT_STATUSES,
    enumName: 'recipient_status',
    default: 'pending',
  })
  status: RecipientStatus;

  @Column({ type: 'varchar', length: 120, name: 'provider_reference', nullable: true })
  providerReference: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error: string | null;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'status_at', nullable: true })
  statusAt: Date | null;
}
