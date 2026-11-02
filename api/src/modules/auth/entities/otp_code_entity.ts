import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { OtpChallenge } from './otp_challenge_entity';

// One code sent by SMS. Only an HMAC of the code is stored. A resend supersedes the previous
// code, so at most one code per challenge is ever usable.
@Entity({ name: 'otp_codes' })
@Index('idx_otp_codes_challenge_created', ['challengeId', 'createdAt'])
export class OtpCode extends BaseEntity {
  @Column({ type: 'uuid', name: 'challenge_id' })
  challengeId: string;

  @ManyToOne(() => OtpChallenge, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'challenge_id' })
  challenge?: OtpChallenge;

  @Column({ type: 'char', length: 64, name: 'code_hash', select: false })
  codeHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'smallint', name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'superseded_at', nullable: true })
  supersededAt: Date | null;
}
