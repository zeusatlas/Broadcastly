import { useEffect, useState } from 'react';

import { useQuery } from '@/hooks/use_query';
import type { RequestOptions } from '@/lib/api';
import type { ApiResponse, Paginated } from '@/types/api';

export const PAGE_SIZE = 30;
const SEARCH_DELAY_MS = 350;

interface LoadedPages<T> {
  key: string;
  page: number;
  items: T[];
  total: number;
  seen?: ApiResponse<Paginated<T>>;
}

// Accumulates the pages of an infinite list. `filtersKey` must name the list and every filter;
// a new key starts again from page 1.
export function usePages<T extends { id: string }>(
  filtersKey: string,
  fetchPage: (page: number, options: RequestOptions) => Promise<ApiResponse<Paginated<T>>>,
) {
  const [loaded, setLoaded] = useState<LoadedPages<T>>({
    key: filtersKey,
    page: 1,
    items: [],
    total: 0,
  });
  const current: LoadedPages<T> =
    loaded.key === filtersKey ? loaded : { key: filtersKey, page: 1, items: [], total: 0 };
  const query = useQuery(['pages', filtersKey, current.page], (options) =>
    fetchPage(current.page, options),
  );
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
      else setLoaded({ ...current, page: 1, seen: undefined });
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
