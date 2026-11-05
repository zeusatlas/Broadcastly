import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { OrganisationExecutive } from '../../auth';
import { Organisation } from '../../organisation';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '../templates_types';

// A reusable official message with approved personalisation fields (FR-SMS-04, FR-SMS-05).
// Archiving sets archived_at; rows are never deleted, so history is kept.
@Entity({ name: 'message_templates' })
// Active names unique per organisation, ignoring case: an expression index, so it lives in the migration only.
@Index('uq_message_templates_organisation_name', { synchronize: false })
@Index('idx_message_templates_organisation_updated', ['organisationId', 'updatedAt'], {
  where: '"archived_at" IS NULL',
})
export class MessageTemplate extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: TEMPLATE_CATEGORIES, enumName: 'message_template_category' })
  category: TemplateCategory;

  @Column({ type: 'uuid', name: 'created_by_executive_id' })
  createdByExecutiveId: string;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_executive_id' })
  createdByExecutive?: OrganisationExecutive;

  @Column({ type: 'uuid', name: 'updated_by_executive_id' })
  updatedByExecutiveId: string;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by_executive_id' })
  updatedByExecutive?: OrganisationExecutive;

  @Column({ type: 'timestamptz', name: 'archived_at', nullable: true })
  archivedAt: Date | null;
}
