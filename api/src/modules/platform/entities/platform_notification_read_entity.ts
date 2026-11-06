import { Column, Entity, PrimaryColumn } from 'typeorm';

// One admin opened one notification. Notifications themselves are audit events, so only reads are stored.
@Entity({ name: 'platform_notification_reads' })
export class PlatformNotificationRead {
  @PrimaryColumn({ type: 'uuid', name: 'platform_admin_id' })
  platformAdminId: string;

  @PrimaryColumn({ type: 'uuid', name: 'audit_event_id' })
  auditEventId: string;

  @Column({ type: 'timestamptz', name: 'read_at', default: () => 'now()' })
  readAt: Date;
}
