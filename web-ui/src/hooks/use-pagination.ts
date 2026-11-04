"use client";

import { useCallback, useMemo, useState } from "react";

type PageInfo = {
  total: number;
  pageSize?: number;
  hasNextPage?: boolean;
};

export function usePagination(initialPageSize: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  const updatePageInfo = useCallback((info: PageInfo) => {
    setTotal(info.total);
    if (info.pageSize !== undefined) setPageSize(info.pageSize);
    if (info.hasNextPage !== undefined) setHasNextPage(info.hasNextPage);
  }, []);

  const resetPage = useCallback(() => setPage(1), []);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const range = useMemo(
    () => ({
      first: total === 0 ? 0 : (page - 1) * pageSize + 1,
      last: Math.min(page * pageSize, total),
    }),
    [page, pageSize, total],
  );

  return {
    page,
    setPage,
    pageSize,
    total,
    hasNextPage,
    totalPages,
    range,
    updatePageInfo,
    resetPage,
  };
}
