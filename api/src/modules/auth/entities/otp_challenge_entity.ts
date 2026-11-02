import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { Executive } from './executive_entity';

// One sign-in attempt, opened once email and phone match an executive. Its codes live in otp_codes;
// a resend adds a code to the same challenge. Consumed when a code is verified.
@Entity({ name: 'otp_challenges' })
export class OtpChallenge extends BaseEntity {
  @Index('idx_otp_challenges_executive_id')
  @Column({ type: 'uuid', name: 'executive_id' })
  executiveId: string;

  @ManyToOne(() => Executive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'executive_id' })
  executive?: Executive;

  // Shown back to the user ("code sent to +233 •• ••• 4567"); the full number stays on members.
  @Column({ type: 'varchar', length: 24, name: 'masked_phone' })
  maskedPhone: string;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'varchar', length: 255, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string | null;
}
