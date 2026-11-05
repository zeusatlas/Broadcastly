import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

@Entity({ name: 'platform_settings' })
export class PlatformSettings extends BaseEntity {
  @Column({ type: 'integer', name: 'max_file_size_mb', default: 25 })
  maxFileSizeMb: number;

  @Column({ type: 'integer', name: 'max_rows_per_file', default: 10000 })
  maxRowsPerFile: number;

  @Column({ type: 'jsonb', name: 'allowed_file_types', default: () => "'{\"csv\":true,\"xlsx\":true}'::jsonb" })
  allowedFileTypes: { csv: boolean; xlsx: boolean };

  @Column({
    type: 'jsonb',
    name: 'notification_preferences',
    default: () => "'{\"security\":true,\"payments\":true,\"service\":true,\"digest\":false}'::jsonb",
  })
  notificationPreferences: {
    security: boolean;
    payments: boolean;
    service: boolean;
    digest: boolean;
  };
}
