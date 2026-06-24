export interface PaginationCursor {
  cursor: string | null;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}
