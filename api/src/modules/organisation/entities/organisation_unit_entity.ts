import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { UNIT_STATUSES, type UnitStatus } from '../organisation_types';

import { Organisation } from './organisation_entity';

// A level inside an organisation: electoral area / branch → polling station (BR-02).
// `type` is a plain string because each organisation configures its own structure (BR-03).
@Entity({ name: 'organisation_units' })
// Names unique among siblings, ignoring case: an expression index, so it lives in the migration only.
@Index('uq_organisation_units_sibling_name', { synchronize: false })
export class OrganisationUnit extends BaseEntity {
  @Index('idx_organisation_units_organisation_id')
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_organisation_units_parent_id')
  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => OrganisationUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent?: OrganisationUnit | null;

  @Column({ type: 'enum', enum: UNIT_STATUSES, enumName: 'unit_status', default: 'active' })
  status: UnitStatus;
}
