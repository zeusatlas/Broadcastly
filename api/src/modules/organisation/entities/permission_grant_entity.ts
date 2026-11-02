import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { Appointment } from './appointment_entity';

// A permission attached to one appointment (FR-IAM-01, FR-IAM-04). It only counts while that
// appointment is active, so revoking the appointment removes its access at once (BR-05).
@Entity({ name: 'permission_grants' })
@Index('uq_permission_grants_active', ['appointmentId', 'permission'], {
  unique: true,
  where: '"revoked_at" IS NULL',
})
export class PermissionGrant extends BaseEntity {
  @Column({ type: 'uuid', name: 'appointment_id' })
  appointmentId: string;

  @ManyToOne(() => Appointment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  // One of PERMISSIONS in the auth module; unknown values are ignored when access is resolved.
  @Column({ type: 'varchar', length: 60 })
  permission: string;

  @Column({ type: 'uuid', name: 'granted_by_executive_id', nullable: true })
  grantedByExecutiveId: string | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'uuid', name: 'revoked_by_executive_id', nullable: true })
  revokedByExecutiveId: string | null;
}
