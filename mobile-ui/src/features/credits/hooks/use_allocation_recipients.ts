import { useState } from 'react';

import type { ApiResponse } from '@/types/api';

import type { AllocationRecipientResponse, AllocationRecipientsResponse } from '../types';

import { useReadAllocationRecipientsQuery } from './use_credits_api';

const PAGE_SIZE = 20;

interface LoadedPages {
  search: string;
  page: number;
  items: AllocationRecipientResponse[];
  seen?: ApiResponse<AllocationRecipientsResponse>;
}

// Accumulates pages of recipients for the picker; a new search starts again from page 1.
export function useAllocationRecipientPages(search: string) {
  const [loaded, setLoaded] = useState<LoadedPages>({ search, page: 1, items: [] });
  const current: LoadedPages = loaded.search === search ? loaded : { search, page: 1, items: [] };
  const query = useReadAllocationRecipientsQuery({
    search: search || undefined,
    page: current.page,
    pageSize: PAGE_SIZE,
  });
  const { response } = query;

  if (response && response !== current.seen && response.data.page === current.page) {
    const byId = new Map(
      (current.page === 1 ? [] : current.items).map((item) => [item.id, item] as const),
    );
    response.data.items.forEach((item) => byId.set(item.id, item));
    setLoaded({ ...current, items: [...byId.values()], seen: response });
  } else if (current !== loaded) {
    setLoaded(current);
  }

  const hasNextPage = current.seen?.data.hasNextPage ?? false;

  return {
    items: current.items,
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
