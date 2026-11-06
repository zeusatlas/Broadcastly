import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Member } from '../../members';
import {
  APPOINTMENT_STATUSES,
  CHAIRMAN_POSITION_ID,
  type AppointmentStatus,
} from '../organisation_types';

import { Organisation } from './organisation_entity';
import { OrganisationUnit } from './organisation_unit_entity';
import { Position } from './position_entity';

// A member holding a position in an organisation, optionally in one of its units, for a period.
// Rows are never deleted: ending one changes `status`, so history survives (FR-ORG-07, BR-05).
@Entity({ name: 'appointments' })
@Index('idx_appointments_member_status', ['memberId', 'status'])
// No one holds the same position in the same place twice at once (NULLS NOT DISTINCT: migration only).
@Index('uq_appointments_active_holding', { synchronize: false })
// At most one active head per organisation, even if two admins appoint at the same moment.
@Index('uq_appointments_active_chairman', ['organisationId'], {
  unique: true,
  where: `"status" = 'active' AND "position_id" = '${CHAIRMAN_POSITION_ID}'`,
})
export class Appointment extends BaseEntity {
  @Column({ type: 'uuid', name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member?: Member;

  @Column({ type: 'uuid', name: 'position_id' })
  positionId: string;

  @ManyToOne(() => Position, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'position_id' })
  position?: Position;

  @Index('idx_appointments_organisation_id')
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  // Null for organisation-wide offices such as head.
  @Index('idx_appointments_unit_id')
  @Column({ type: 'uuid', name: 'unit_id', nullable: true })
  unitId: string | null;

  @ManyToOne(() => OrganisationUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: OrganisationUnit | null;

  @Column({
    type: 'enum',
    enum: APPOINTMENT_STATUSES,
    enumName: 'appointment_status',
    default: 'active',
  })
  status: AppointmentStatus;

  @Column({ type: 'timestamptz', name: 'effective_from' })
  effectiveFrom: Date;

  @Column({ type: 'timestamptz', name: 'effective_to', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'uuid', name: 'appointed_by_executive_id', nullable: true })
  appointedByExecutiveId: string | null;

  @Column({ type: 'uuid', name: 'ended_by_executive_id', nullable: true })
  endedByExecutiveId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'end_reason', nullable: true })
  endReason: string | null;
}
