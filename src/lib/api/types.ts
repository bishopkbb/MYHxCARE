export type SuccessEnvelope<T> = {
  data: T;
  meta?: PaginationMeta;
};

export type PaginationMeta = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type PaginatedEnvelope<T> = {
  data: T[];
  meta: PaginationMeta;
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
