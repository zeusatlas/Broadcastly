import { useEffect, useRef } from 'react';

import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';
import type { PageParams } from '@/types/api';

import type { ImportRowResponse, ImportRowStatus, ListImportRowsParams } from '../types';

const POLL_INTERVAL_MS = 3_000;

export const useReadImportsQuery = (params: PageParams) =>
  useQuery(['member-imports', 'list', params], (options) =>
    api.memberImports.readImports(params, options),
  );

export const useReadImportQuery = (importId: string) =>
  useQuery(
    ['member-imports', 'detail', importId],
    (options) => api.memberImports.readImport({ importId }, options),
    { enabled: Boolean(importId) },
  );

export const useReadImportRowsQuery = (importId: string, params: ListImportRowsParams) =>
  useQuery(
    ['member-imports', 'rows', importId, params],
    (options) => api.memberImports.readImportRows({ importId, params }, options),
    { enabled: Boolean(importId) },
  );

// One tab of the preview: every page of rows loaded so far for that filter.
export const useImportRowPages = (importId: string, filter: ImportRowStatus) =>
  usePages<ImportRowResponse>(`import-rows:${importId}:${filter}`, (page, options) =>
    api.memberImports.readImportRows(
      { importId, params: { page, pageSize: PAGE_SIZE, filter } },
      options,
    ),
  );

export const useStartImportMutation = () => useMutation(api.memberImports.startImport);

export const useResolveImportRowMutation = () => useMutation(api.memberImports.resolveImportRow);

export const useConfirmImportMutation = () => useMutation(api.memberImports.confirmImport);

export const useCancelImportMutation = () => useMutation(api.memberImports.cancelImport);

// The import, re-read every few seconds while the server is still checking or saving it.
// The timer stops as soon as the work ends or the screen unmounts (NFR-PERF-01).
export function useImportStatus(importId: string) {
  const query = useReadImportQuery(importId);
  const refetch = useRef(query.refetch);
  const status = query.data?.status;
  const isWorking = status === 'processing' || status === 'confirming';

  useEffect(() => {
    refetch.current = query.refetch;
  }, [query.refetch]);

  useEffect(() => {
    if (!isWorking) return;
    const timer = setInterval(() => refetch.current(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isWorking]);

  return { ...query, isWorking };
}
