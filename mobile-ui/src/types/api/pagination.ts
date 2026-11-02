// Field names are provisional until the backend publishes its pagination shape (SRS §6.3).

export interface PageParams {
  page?: number;
  pageSize?: number;
}

// Used as the `data` of a list endpoint: ApiResponse<Paginated<MemberResponse>>.
// Every list is paginated: member and delivery lists reach tens of thousands of rows.
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}
