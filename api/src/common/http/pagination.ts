import { z } from 'zod';

export const MAX_PAGE_SIZE = 100;

// Every list endpoint validates its query with this, so no client can request an unbounded page.
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export interface PageParams {
  page: number;
  pageSize: number;
}

// Must match Paginated<T> in mobile-ui/src/types/api/pagination.ts.
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export function toPaginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: PageParams,
): Paginated<T> {
  return { items, page, pageSize, total, hasNextPage: page * pageSize < total };
}

export function toSkipTake({ page, pageSize }: PageParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
