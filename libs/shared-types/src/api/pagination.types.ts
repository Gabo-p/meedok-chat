export interface PaginationCursor {
  cursor: string | null;
  limit: number;
}

export interface PaginatedMeta {
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}
