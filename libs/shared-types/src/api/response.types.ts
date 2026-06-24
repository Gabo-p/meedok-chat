export interface ResponseMeta {
  total?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}
