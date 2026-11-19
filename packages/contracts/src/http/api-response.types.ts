
export interface ApiSuccessResponse<T, M = null> {
  success: true;
  message: string;
  data: T;
  meta: M;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  error: {
    code: string;
    details: unknown | null;
    requestId: string;
  };
  meta: null;
}

export type ApiResponse<T, M = null> =
  | ApiSuccessResponse<T, M>
  | ApiErrorResponse;

export interface PaginationMeta {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
