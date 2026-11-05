import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { ORGANISATION_STATUSES, type OrganisationStatus } from '../organisation_types';

// A tenant: one constituency (or other organisation). Its members, units and appointments all
// point here, so a chairman's data never mixes with another organisation's.
@Entity({ name: 'organisations' })
// Case-insensitive unique names: an expression index, so it lives in the migration only.
@Index('uq_organisations_name', { synchronize: false })
export class Organisation extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  // Plain string so new kinds of organisation need no migration.
  @Column({ type: 'varchar', length: 40, default: 'constituency' })
  type: string;

  @Column({ type: 'varchar', length: 120, name: 'head_title', default: 'Head' })
  headTitle: string;

  @Column({
    type: 'enum',
    enum: ORGANISATION_STATUSES,
    enumName: 'organisation_status',
    default: 'active',
  })
  status: OrganisationStatus;

  // Relative to UPLOADS_DIR, e.g. "organisation-logos/<uuid>.png"; the API returns a full logoUrl.
  @Column({ type: 'varchar', length: 255, name: 'logo_path', nullable: true })
  logoPath: string | null;
}
