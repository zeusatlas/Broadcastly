import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { UNIT_STATUSES, type UnitStatus } from '../organisation_types';

// Constituency → electoral area / branch → polling station. Each polling station is its own unit (BR-02).
// `type` is a plain string because the party configures its own structure (BR-03).
@Entity({ name: 'organisational_units' })
// Case-insensitive unique constituency names: an expression index, so it lives in the migration only.
@Index('uq_organisational_units_constituency_name', { synchronize: false })
export class OrganisationalUnit extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_organisational_units_parent_id')
  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => OrganisationalUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent?: OrganisationalUnit | null;

  @Column({ type: 'enum', enum: UNIT_STATUSES, enumName: 'unit_status', default: 'active' })
  status: UnitStatus;
}
