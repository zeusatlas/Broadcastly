import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import {
  DUPLICATE_MATCHES,
  IMPORT_RESOLUTIONS,
  IMPORT_ROW_OUTCOMES,
  IMPORT_ROW_STATUSES,
  type DuplicateMatch,
  type ImportResolution,
  type ImportRowOutcome,
  type ImportRowStatus,
  type ImportRowValues,
} from '../member_import_types';

import { MemberImport } from './member_import_entity';

// One data row of an uploaded file: what it said, what it normalises to and what became of it.
@Entity({ name: 'member_import_rows' })
@Index('uq_member_import_rows_number', ['importId', 'rowNumber'], { unique: true })
@Index('idx_member_import_rows_status', ['importId', 'status', 'rowNumber'])
export class MemberImportRow extends BaseEntity {
  @Column({ type: 'uuid', name: 'import_id' })
  importId: string;

  @ManyToOne(() => MemberImport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'import_id' })
  memberImport?: MemberImport;

  // Spreadsheet row number, so the user can find it in their file (row 1 is the header).
  @Column({ type: 'integer', name: 'row_number' })
  rowNumber: number;

  @Column({ type: 'jsonb', name: 'raw_values' })
  rawValues: ImportRowValues;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'middle_name', nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 50, name: 'party_id', nullable: true })
  partyId: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'uuid', name: 'unit_id', nullable: true })
  unitId: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  errors: Record<string, string[]>;

  @Column({ type: 'enum', enum: IMPORT_ROW_STATUSES, enumName: 'member_import_row_status' })
  status: ImportRowStatus;

  @Column({
    type: 'enum',
    enum: DUPLICATE_MATCHES,
    enumName: 'member_import_duplicate_match',
    name: 'duplicate_match',
    nullable: true,
  })
  duplicateMatch: DuplicateMatch | null;

  @Column({ type: 'uuid', name: 'duplicate_member_id', nullable: true })
  duplicateMemberId: string | null;

  @Column({ type: 'integer', name: 'duplicate_of_row', nullable: true })
  duplicateOfRow: number | null;

  @Column({
    type: 'enum',
    enum: IMPORT_RESOLUTIONS,
    enumName: 'member_import_resolution',
    nullable: true,
  })
  resolution: ImportResolution | null;

  @Column({
    type: 'enum',
    enum: IMPORT_ROW_OUTCOMES,
    enumName: 'member_import_row_outcome',
    nullable: true,
  })
  outcome: ImportRowOutcome | null;

  @Column({ type: 'uuid', name: 'member_id', nullable: true })
  memberId: string | null;
}
