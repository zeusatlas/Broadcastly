import type { PageParams } from '../../common/http/pagination';

export const MEMBER_IMPORT_STATUSES = [
  'processing',
  'ready',
  'confirming',
  'completed',
  'failed',
  'cancelled',
] as const;
export type MemberImportStatus = (typeof MEMBER_IMPORT_STATUSES)[number];

export const MEMBER_IMPORT_FILE_TYPES = ['csv', 'xlsx'] as const;
export type MemberImportFileType = (typeof MEMBER_IMPORT_FILE_TYPES)[number];

export const IMPORT_ROW_STATUSES = ['valid', 'invalid', 'duplicate'] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const IMPORT_RESOLUTIONS = ['skip', 'update_existing', 'create_new'] as const;
export type ImportResolution = (typeof IMPORT_RESOLUTIONS)[number];

export const IMPORT_ROW_OUTCOMES = ['created', 'updated', 'skipped', 'rejected'] as const;
export type ImportRowOutcome = (typeof IMPORT_ROW_OUTCOMES)[number];

export const DUPLICATE_MATCHES = ['party_id', 'phone'] as const;
export type DuplicateMatch = (typeof DUPLICATE_MATCHES)[number];

// The template's columns, in order. `key` is what the parser matches a header against.
export const IMPORT_COLUMNS = [
  { key: 'firstName', header: 'First name', isRequired: true },
  { key: 'middleName', header: 'Middle name', isRequired: false },
  { key: 'lastName', header: 'Last name', isRequired: true },
  { key: 'partyId', header: 'Party ID', isRequired: false },
  { key: 'phone', header: 'Phone', isRequired: false },
  { key: 'dateOfBirth', header: 'Date of birth', isRequired: false },
  { key: 'unit', header: 'Unit', isRequired: false },
] as const;
export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]['key'];
export type ImportRowValues = Partial<Record<ImportColumnKey, string>>;

export interface StartMemberImportRequest {
  defaultUnitId?: string;
}

export interface ListImportRowsRequest extends PageParams {
  filter?: ImportRowStatus;
}

export interface MemberImportParams {
  importId: string;
}

export interface ImportRowParams extends MemberImportParams {
  rowId: string;
}

export interface ResolveImportRowRequest {
  resolution: ImportResolution;
}

export interface MemberImportCounts {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  // Rows a confirm would save: valid ones plus duplicates resolved to update or create.
  accepted: number;
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
}

export interface MemberImportResponse {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: MemberImportFileType;
  status: MemberImportStatus;
  failureReason: string | null;
  defaultUnitId: string | null;
  defaultUnitName: string | null;
  uploadedBy: string | null;
  counts: MemberImportCounts;
  createdAt: Date;
  parsedAt: Date | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface ImportRowDuplicate {
  matchedOn: DuplicateMatch;
  // Null when the match is another row of this file, or a member outside your units.
  memberId: string | null;
  memberName: string | null;
  unitName: string | null;
  rowNumber: number | null;
}

export interface ImportRowResponse {
  id: string;
  rowNumber: number;
  status: ImportRowStatus;
  values: ImportRowValues;
  errors: Record<string, string[]>;
  duplicate: ImportRowDuplicate | null;
  resolution: ImportResolution | null;
  outcome: ImportRowOutcome | null;
}
