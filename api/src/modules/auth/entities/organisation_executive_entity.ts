import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Member } from '../../members';
import { EXECUTIVE_STATUSES, type ExecutiveStatus } from '../auth_types';

// A member of an organisation promoted to executive: their login (§7). What they hold comes from
// their appointments (positions), what they may do from permissions.
@Entity({ name: 'organisation_executives' })
export class OrganisationExecutive extends BaseEntity {
  @Index('idx_organisation_executives_organisation_id')
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'member_id' })
  memberId: string;

  // Composite key: the database guarantees the member belongs to this same organisation.
  @OneToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'member_id', referencedColumnName: 'id' },
    { name: 'organisation_id', referencedColumnName: 'organisationId' },
  ])
  member?: Member;

  // Always stored lowercased and trimmed, so lookups are exact matches.
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

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
