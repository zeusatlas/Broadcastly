import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

// A configurable office, e.g. "Polling Station Chairman", and who it reports to (FR-ORG-08, BR-03).
// Code must never branch on `title`; access comes from permissions (BR-01).
@Entity({ name: 'positions' })
export class Position extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  title: string;

  // The unit type this office exists in, e.g. "polling_station".
  @Column({ type: 'varchar', length: 40, name: 'unit_type' })
  unitType: string;

  @Column({ type: 'uuid', name: 'reports_to_position_id', nullable: true })
  reportsToPositionId: string | null;

  @ManyToOne(() => Position, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reports_to_position_id' })
  reportsTo?: Position | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
