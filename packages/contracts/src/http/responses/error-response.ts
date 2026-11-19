
import type { ApiErrorResponse } from "../api-response.types";

interface ErrorResponseOptions {
  message: string;
  code: string;
  requestId: string;
  details?: unknown | null;
}

export function createErrorResponse({
  message,
  code,
  requestId,
  details = null,
}: ErrorResponseOptions): ApiErrorResponse {
  return {
    success: false,
    message,
    data: null,
    error: {
      code,
      details,
      requestId,
    },
    meta: null,
  };
}
