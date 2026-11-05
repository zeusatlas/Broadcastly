import { useEffect, useState } from 'react';

import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';
import type { ApiResponse } from '@/types/api';

import type { ListTemplatesParams, TemplateResponse, TemplatesResponse } from '../types';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 350;

export const useReadTemplatesQuery = (params: ListTemplatesParams) =>
  useQuery(['templates', 'list', params], (options) =>
    api.templates.readTemplates(params, options),
  );

export const useReadTemplateQuery = (templateId: string) =>
  useQuery(
    ['templates', 'detail', templateId],
    (options) => api.templates.readTemplate({ templateId }, options),
    { enabled: Boolean(templateId) },
  );

export const useCreateTemplateMutation = () => useMutation(api.templates.createTemplate);

export const useUpdateTemplateMutation = () => useMutation(api.templates.updateTemplate);

export const useArchiveTemplateMutation = () => useMutation(api.templates.archiveTemplate);

interface LoadedPages {
  key: string;
  page: number;
  items: TemplateResponse[];
  total: number;
  seen?: ApiResponse<TemplatesResponse>;
}

// Accumulates pages for an infinite list; a new filter starts again from page 1.
export function useTemplatePages(filters: Omit<ListTemplatesParams, 'page' | 'pageSize'>) {
  const key = JSON.stringify(filters);
  const [loaded, setLoaded] = useState<LoadedPages>({ key, page: 1, items: [], total: 0 });
  const current: LoadedPages = loaded.key === key ? loaded : { key, page: 1, items: [], total: 0 };
  const query = useReadTemplatesQuery({ ...filters, page: current.page, pageSize: PAGE_SIZE });
  const { response } = query;

  if (response && response !== current.seen && response.data.page === current.page) {
    const byId = new Map(
      (current.page === 1 ? [] : current.items).map((item) => [item.id, item] as const),
    );
    response.data.items.forEach((item) => byId.set(item.id, item));
    setLoaded({
      ...current,
      items: [...byId.values()],
      total: response.data.total,
      seen: response,
    });
  } else if (current !== loaded) {
    setLoaded(current);
  }

  const hasNextPage = current.seen?.data.hasNextPage ?? false;

  return {
    items: current.items,
    total: current.total,
    isLoading: query.isLoading && current.items.length === 0,
    isFetching: query.isFetching,
    error: query.error,
    hasNextPage,
    loadMore: () => {
      if (hasNextPage && !query.isFetching) setLoaded({ ...current, page: current.page + 1 });
    },
    reload: () => {
      if (current.page === 1) query.refetch();
      else setLoaded({ ...current, page: 1 });
    },
  };
}

export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DELAY_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
