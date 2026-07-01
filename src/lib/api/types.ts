// Exact API response envelope shapes from the Go backend contract.
// Field names must match verbatim — do not rename (e.g. page_size not limit).

export type ApiMeta = {
  request_id: string;
  timestamp?: string;
};

export type Pagination = {
  page: number;
  page_size: number; // NOT limit, NOT page_limit
  total_items: number; // NOT total
  total_pages: number;
};

/** Single-resource success response. */
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

/** Paginated list success response. */
export type ApiListResponse<T> = {
  success: true;
  data: T[];
  pagination: Pagination;
  meta: ApiMeta;
};

/** Business logic error returned by the backend. */
export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ApiMeta;
};

/** Field-level validation error — code is always VALIDATION_FAILED. */
export type ApiValidationErrorResponse = {
  success: false;
  error: {
    code: 'VALIDATION_FAILED';
    message: string;
    fields: Array<{ field: string; message: string }>;
  };
  meta: ApiMeta;
};

/** Query parameters accepted by every paginated list endpoint. */
export type PaginationParams = {
  page?: number;
  page_size?: number; // default 20, max 100
  sort?: string; // e.g. "created_at:desc"
  q?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
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
