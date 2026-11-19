
import type {
  ApiSuccessResponse,
  PaginationMeta,
} from "../api-response.types";

export function createPaginatedResponse<T>(
  message: string,
  data: T[],
  pagination: PaginationMeta["pagination"],
): ApiSuccessResponse<T[], PaginationMeta> {
  return {
    success: true,
    message,
    data,
    meta: {
      pagination,
    },
  };
}
