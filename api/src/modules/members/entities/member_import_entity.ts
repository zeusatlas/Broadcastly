import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { Organisation } from '../../organisation';
import {
  MEMBER_IMPORT_FILE_TYPES,
  MEMBER_IMPORT_STATUSES,
  type MemberImportFileType,
  type MemberImportStatus,
} from '../member_import_types';

// One spreadsheet import run: who uploaded what, its progress and its summary (FR-MEM-08, FR-MEM-09).
@Entity({ name: 'member_imports' })
@Index('idx_member_imports_organisation_created', ['organisationId', 'createdAt'])
@Index('idx_member_imports_uploader_created', ['uploadedByExecutiveId', 'createdAt'])
export class MemberImport extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'uuid', name: 'uploaded_by_executive_id' })
  uploadedByExecutiveId: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName: string;

  @Column({ type: 'integer', name: 'file_size' })
  fileSize: number;

  @Column({
    type: 'enum',
    enum: MEMBER_IMPORT_FILE_TYPES,
    enumName: 'member_import_file_type',
    name: 'file_type',
  })
  fileType: MemberImportFileType;

  // Relative to MEMBER_IMPORT_DIR while the file waits to be parsed; null once it is deleted.
  @Column({ type: 'varchar', length: 255, name: 'stored_path', nullable: true })
  storedPath: string | null;

  @Column({ type: 'uuid', name: 'default_unit_id', nullable: true })
  defaultUnitId: string | null;

  @Column({
    type: 'enum',
    enum: MEMBER_IMPORT_STATUSES,
    enumName: 'member_import_status',
    default: 'processing',
  })
  status: MemberImportStatus;

  @Column({ type: 'varchar', length: 255, name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @Column({ type: 'integer', name: 'total_rows', default: 0 })
  totalRows: number;

  @Column({ type: 'integer', name: 'valid_rows', default: 0 })
  validRows: number;

  @Column({ type: 'integer', name: 'invalid_rows', default: 0 })
  invalidRows: number;

  @Column({ type: 'integer', name: 'duplicate_rows', default: 0 })
  duplicateRows: number;

  @Column({ type: 'integer', name: 'created_count', default: 0 })
  createdCount: number;

  @Column({ type: 'integer', name: 'updated_count', default: 0 })
  updatedCount: number;

  @Column({ type: 'integer', name: 'skipped_count', default: 0 })
  skippedCount: number;

  @Column({ type: 'integer', name: 'rejected_count', default: 0 })
  rejectedCount: number;

  @Column({ type: 'uuid', name: 'confirmed_by_executive_id', nullable: true })
  confirmedByExecutiveId: string | null;

  @Column({ type: 'timestamptz', name: 'parsed_at', nullable: true })
  parsedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;
}
