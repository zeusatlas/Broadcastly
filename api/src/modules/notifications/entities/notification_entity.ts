import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

// One in-app notice for one executive (FR-NOT-01): approval requests, decisions and broadcast outcomes.
@Entity({ name: 'notifications' })
@Index('idx_notifications_executive_created', ['executiveId', 'createdAt'])
@Index('idx_notifications_executive_unread', ['executiveId'], { where: `"read_at" IS NULL` })
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @Column({ type: 'uuid', name: 'executive_id' })
  executiveId: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  body: string;

  @Column({ type: 'uuid', name: 'broadcast_id', nullable: true })
  broadcastId: string | null;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt: Date | null;
}
