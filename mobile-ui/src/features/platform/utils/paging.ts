import type { Paginated } from '@/types/api';

export const PAGE_SIZE = 50;

export const pageFootnote = (page: Paginated<unknown> | undefined) =>
  page?.hasNextPage ? `Showing ${page.items.length} of ${page.total.toLocaleString()}` : undefined;
