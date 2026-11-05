import { http, type RequestOptions } from '@/lib/api';
import type { PageParams } from '@/types/api';

import type {
  ImportRowResponse,
  ImportRowsResponse,
  ListImportRowsParams,
  MemberImportResponse,
  MemberImportsResponse,
  ResolveImportRowRequest,
  StartMemberImportRequest,
} from '../types';

// Spreadsheet imports (FR-MEM-02..08): upload, poll, preview, decide duplicates, confirm or cancel.
export const memberImportEndpoints = {
  readImports: (params: PageParams, options?: RequestOptions) =>
    http.get<MemberImportsResponse>('/members/imports', { ...options, params }),

  readImport: ({ importId }: { importId: string }, options?: RequestOptions) =>
    http.get<MemberImportResponse>(`/members/imports/${importId}`, options),

  readImportRows: (
    { importId, params }: { importId: string; params: ListImportRowsParams },
    options?: RequestOptions,
  ) => http.get<ImportRowsResponse>(`/members/imports/${importId}/rows`, { ...options, params }),

  startImport: ({ file, defaultUnitId }: StartMemberImportRequest) => {
    const form = new FormData();
    // React Native's FormData takes { uri, name, type } for a file; the web picker gives a real File.
    form.append(
      'file',
      file.file ??
        ({
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? 'application/octet-stream',
        } as unknown as Blob),
    );
    if (defaultUnitId) form.append('defaultUnitId', defaultUnitId);
    return http.upload<MemberImportResponse>('/members/imports', form, { timeout: 120_000 });
  },

  resolveImportRow: ({
    importId,
    rowId,
    credentials,
  }: {
    importId: string;
    rowId: string;
    credentials: ResolveImportRowRequest;
  }) =>
    http.post<ImportRowResponse, ResolveImportRowRequest>(
      `/members/imports/${importId}/rows/${rowId}/resolution`,
      credentials,
    ),

  confirmImport: ({ importId }: { importId: string }) =>
    http.post<MemberImportResponse>(`/members/imports/${importId}/confirm`),

  cancelImport: ({ importId }: { importId: string }) =>
    http.post<MemberImportResponse>(`/members/imports/${importId}/cancel`),
};
