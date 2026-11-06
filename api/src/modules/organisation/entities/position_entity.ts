import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { Organisation } from './organisation_entity';

// An office an executive holds, e.g. "Constituency Organiser" (FR-ORG-08, BR-03). Each organisation's
// head creates its own; built-in offices (Head) have no organisation. Never branch on `title`.
@Entity({ name: 'positions' })
// Titles unique per organisation, ignoring case: an expression index, so it lives in the migration only.
@Index('uq_positions_organisation_title', { synchronize: false })
export class Position extends BaseEntity {
  @Index('idx_positions_organisation_id')
  @Column({ type: 'uuid', name: 'organisation_id', nullable: true })
  organisationId: string | null;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  // Where the office sits: "organisation" for organisation-wide, or a unit type such as "branch".
  @Column({ type: 'varchar', length: 40, name: 'unit_type', default: 'organisation' })
  unitType: string;

  @Column({ type: 'uuid', name: 'reports_to_position_id', nullable: true })
  reportsToPositionId: string | null;

  @ManyToOne(() => Position, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reports_to_position_id' })
  reportsTo?: Position | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
