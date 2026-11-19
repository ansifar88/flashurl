
import type { ApiSuccessResponse } from "../api-response.types";

export function createSuccessResponse<T, M = null>(
  message: string,
  data: T,
  meta: M = null as M,
): ApiSuccessResponse<T, M> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
