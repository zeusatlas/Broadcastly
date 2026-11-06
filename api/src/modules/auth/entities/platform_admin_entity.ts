import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import {
  PLATFORM_ADMIN_STATUSES,
  type PlatformAdminStatus,
  type PlatformPermission,
} from '../auth_types';

// A Broadcastly operator: runs the platform from the web app. Not a party member, so no members row.
@Entity({ name: 'platform_admins' })
export class PlatformAdmin extends BaseEntity {
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  // Stored lowercased and trimmed, so lookups are exact matches.
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  // E.164. Receives the sign-in code.
  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @Column({
    type: 'enum',
    enum: PLATFORM_ADMIN_STATUSES,
    enumName: 'platform_admin_status',
    default: 'active',
  })
  status: PlatformAdminStatus;

  // The main admin: holds every platform permission, including ones added later. Set only by the CLI.
  @Column({ type: 'boolean', name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions: PlatformPermission[];

  @Column({ type: 'smallint', name: 'failed_sign_in_attempts', default: 0 })
  failedSignInAttempts: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', name: 'last_sign_in_at', nullable: true })
  lastSignInAt: Date | null;

  // "Mark all as read": every notification up to this moment counts as read.
  @Column({ type: 'timestamptz', name: 'notifications_read_at', nullable: true })
  notificationsReadAt: Date | null;
}
