import type { PageParams, Paginated } from '@/types/api';

export type MemberStatus = 'active' | 'inactive';

export interface MemberResponse {
  id: string;
  organisationId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  partyId: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  unitId: string | null;
  unitName: string | null;
  status: MemberStatus;
  isExecutive: boolean;
  createdAt: string;
}

export interface ListMembersParams extends PageParams {
  search?: string;
  status?: MemberStatus;
  unitId?: string;
}

export interface CreateMemberRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  partyId?: string;
  phone?: string;
  dateOfBirth?: string;
  unitId?: string;
}

// null clears an optional field; an omitted field is left as it is.
export interface UpdateMemberRequest {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  partyId?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  unitId?: string;
}

export type MembersResponse = Paginated<MemberResponse>;

export type MemberImportStatus =
  'processing' | 'ready' | 'confirming' | 'completed' | 'failed' | 'cancelled';
export type ImportRowStatus = 'valid' | 'invalid' | 'duplicate';
export type ImportResolution = 'skip' | 'update_existing' | 'create_new';
export type ImportRowOutcome = 'created' | 'updated' | 'skipped' | 'rejected';

export interface MemberImportCounts {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
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
  fileType: 'csv' | 'xlsx';
  status: MemberImportStatus;
  failureReason: string | null;
  defaultUnitId: string | null;
  defaultUnitName: string | null;
  uploadedBy: string | null;
  counts: MemberImportCounts;
  createdAt: string;
  parsedAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export type MemberImportsResponse = Paginated<MemberImportResponse>;

export interface ImportRowDuplicate {
  matchedOn: 'party_id' | 'phone';
  memberId: string | null;
  memberName: string | null;
  unitName: string | null;
  rowNumber: number | null;
}

export interface ImportRowResponse {
  id: string;
  rowNumber: number;
  status: ImportRowStatus;
  values: Partial<
    Record<
      'firstName' | 'middleName' | 'lastName' | 'partyId' | 'phone' | 'dateOfBirth' | 'unit',
      string
    >
  >;
  errors: Record<string, string[]>;
  duplicate: ImportRowDuplicate | null;
  resolution: ImportResolution | null;
  outcome: ImportRowOutcome | null;
}

export type ImportRowsResponse = Paginated<ImportRowResponse>;

export interface ListImportRowsParams extends PageParams {
  filter?: ImportRowStatus;
}

export interface SpreadsheetFile {
  uri: string;
  name: string;
  mimeType?: string;
  // Present on web, where the picker hands back a browser File.
  file?: File;
}

export interface StartMemberImportRequest {
  file: SpreadsheetFile;
  defaultUnitId?: string;
}

export interface ResolveImportRowRequest {
  resolution: ImportResolution;
}
