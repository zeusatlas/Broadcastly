import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import {
  MEMBERSHIP_SOURCES,
  MEMBERSHIP_STATUSES,
  type MembershipSource,
  type MembershipStatus,
} from '../members_types';

import { Member } from './member_entity';

// Ties a member to the unit they belong to (FR-MEM-07) and records where the record came from
// (FR-MEM-09). One active row per member; moving unit ends the old row so history is kept.
@Entity({ name: 'memberships' })
@Index('uq_memberships_active_member', ['memberId'], { unique: true, where: `"status" = 'active'` })
@Index('idx_memberships_unit_active', ['unitId'], { where: `"status" = 'active'` })
@Index('idx_memberships_import', ['importId'], { where: `"import_id" IS NOT NULL` })
export class Membership extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'member_id', referencedColumnName: 'id' },
    { name: 'organisation_id', referencedColumnName: 'organisationId' },
  ])
  member?: Member;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @Column({
    type: 'enum',
    enum: MEMBERSHIP_STATUSES,
    enumName: 'membership_status',
    default: 'active',
  })
  status: MembershipStatus;

  @Column({ type: 'enum', enum: MEMBERSHIP_SOURCES, enumName: 'membership_source' })
  source: MembershipSource;

  // The member_imports row that placed this member here (FK added with the imports migration).
  @Column({ type: 'uuid', name: 'import_id', nullable: true })
  importId: string | null;

  @Column({ type: 'uuid', name: 'created_by_executive_id', nullable: true })
  createdByExecutiveId: string | null;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt: Date | null;
}
