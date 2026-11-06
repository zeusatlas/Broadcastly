import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

import { Organisation } from './organisation_entity';

@Entity({ name: 'organisation_notification_preferences' })
export class OrganisationNotificationPreferences extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id', unique: true })
  organisationId: string;

  @OneToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({
    type: 'jsonb',
    default: () =>
      '\'{"security":true,"approvals":true,"broadcasts":true,"imports":true,"digest":false}\'::jsonb',
  })
  preferences: {
    security: boolean;
    approvals: boolean;
    broadcasts: boolean;
    imports: boolean;
    digest: boolean;
  };
}
