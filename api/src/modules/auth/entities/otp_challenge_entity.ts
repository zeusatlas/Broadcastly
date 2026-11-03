import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { OrganisationExecutive } from './organisation_executive_entity';
import { PlatformAdmin } from './platform_admin_entity';

// One sign-in attempt, opened once email and phone match an account (executive or platform admin). Its codes live in otp_codes;
// a resend adds a code to the same challenge. Consumed when a code is verified.
@Entity({ name: 'otp_challenges' })
@Check('chk_otp_challenges_one_account', 'num_nonnulls("executive_id", "platform_admin_id") = 1')
export class OtpChallenge extends BaseEntity {
  @Index('idx_otp_challenges_executive_id')
  @Column({ type: 'uuid', name: 'executive_id', nullable: true })
  executiveId: string | null;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'executive_id' })
  executive?: OrganisationExecutive;

  @Index('idx_otp_challenges_platform_admin_id')
  @Column({ type: 'uuid', name: 'platform_admin_id', nullable: true })
  platformAdminId: string | null;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'platform_admin_id' })
  platformAdmin?: PlatformAdmin;

  // Shown back to the user ("code sent to +233 •• ••• 4567"); the full number is never copied here.
  @Column({ type: 'varchar', length: 24, name: 'masked_phone' })
  maskedPhone: string;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'varchar', length: 255, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string | null;
}
