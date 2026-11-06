import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Organisation } from '../../organisation';
import { MEMBER_STATUSES, type MemberStatus } from '../members_types';

// One record per party member, always inside one organisation. An executive is a member promoted
// to a login, so appointing a member never duplicates them (FR-ORG-05, BR-04).
@Entity({ name: 'members' })
// A member ID is unique within its organisation; other organisations may reuse it.
@Index('uq_members_organisation_member_number', ['organisationId', 'memberNumber'], {
  unique: true,
  where: '"member_number" IS NOT NULL',
})
// Target of organisation_executives' composite key (member + organisation).
@Unique('uq_members_id_organisation', ['id', 'organisationId'])
@Index('idx_members_organisation_status', ['organisationId', 'status'])
@Index('idx_members_organisation_phone', ['organisationId', 'phone'])
export class Member extends BaseEntity {
  @Index('idx_members_organisation_id')
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'middle_name', nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 50, name: 'member_number', nullable: true })
  memberNumber: string | null;

  // E.164, e.g. +233241234567 (FR-MEM-05).
  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

  // Calendar date only ('YYYY-MM-DD'), so no timezone can shift it a day.
  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: string | null;

  // Deactivated, never deleted: history and past broadcasts still point here (FR-MEM-01).
  @Column({ type: 'enum', enum: MEMBER_STATUSES, enumName: 'member_status', default: 'active' })
  status: MemberStatus;

  @Column({ type: 'timestamptz', name: 'deactivated_at', nullable: true })
  deactivatedAt: Date | null;
}
