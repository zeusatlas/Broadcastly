import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Member } from '../../members';
import { EXECUTIVE_STATUSES, USER_ROLES, type ExecutiveStatus, type UserRole } from '../auth_types';

// An executive's login, linked to exactly one person (§7). Members without accounts never sign in.
@Entity({ name: 'executives' })
export class Executive extends BaseEntity {
  // Unique through the one-to-one join below.
  @Column({ type: 'uuid', name: 'member_id' })
  memberId: string;

  @OneToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member?: Member;

  // Always stored lowercased and trimmed, so lookups are exact matches.
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: EXECUTIVE_STATUSES,
    enumName: 'executive_status',
    default: 'active',
  })
  status: ExecutiveStatus;

  @Column({ type: 'smallint', name: 'failed_sign_in_attempts', default: 0 })
  failedSignInAttempts: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', name: 'last_sign_in_at', nullable: true })
  lastSignInAt: Date | null;
}
