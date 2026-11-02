import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Member } from '../../members';
import {
  APPOINTMENT_STATUSES,
  CONSTITUENCY_CHAIRMAN_POSITION_ID,
  type AppointmentStatus,
} from '../organisation_types';

import { OrganisationalUnit } from './organisational_unit_entity';
import { Position } from './position_entity';

// A member holding a position in a unit for a period. Rows are never deleted: revoking or
// ending one changes `status`, so history survives (FR-ORG-07, BR-05).
@Entity({ name: 'appointments' })
@Index('idx_appointments_member_status', ['memberId', 'status'])
// At most one active chairman per constituency, even if two admins appoint at the same moment.
@Index('uq_appointments_active_chairman', ['unitId'], {
  unique: true,
  where: `"status" = 'active' AND "position_id" = '${CONSTITUENCY_CHAIRMAN_POSITION_ID}'`,
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

  @Index('idx_appointments_unit_id')
  @Column({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @ManyToOne(() => OrganisationalUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit?: OrganisationalUnit;

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

  // Executive ids, not FKs: organisation must not depend on the auth module's tables.
  @Column({ type: 'uuid', name: 'appointed_by_executive_id', nullable: true })
  appointedByExecutiveId: string | null;

  @Column({ type: 'uuid', name: 'ended_by_executive_id', nullable: true })
  endedByExecutiveId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'end_reason', nullable: true })
  endReason: string | null;
}
