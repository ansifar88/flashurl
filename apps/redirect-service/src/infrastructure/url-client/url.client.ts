
import { AppError, ErrorCode } from "@flashurl/errors";
import { env } from "../../config/env";

export interface UrlMetadata {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface UrlServiceErrorResponse {
  success: false;
  error: {
    code: string;
    message?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUrlMetadata(value: unknown): value is UrlMetadata {
  if (!isRecord(value)) return false;

  if (
    typeof value.id !== "string" ||
    typeof value.shortCode !== "string" ||
    typeof value.originalUrl !== "string" ||
    typeof value.isActive !== "boolean"
  ) {
    return false;
  }

  if (
    value.expiresAt !== null &&
    typeof value.expiresAt !== "string"
  ) {
    return false;
  }

  if (
    typeof value.expiresAt === "string" &&
    !Number.isFinite(Date.parse(value.expiresAt))
  ) {
    return false;
  }

  try {
    const parsedUrl = new URL(value.originalUrl);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function mapUpstreamError(
  status: number,
  body: unknown,
): AppError {
  if (isRecord(body) && isRecord(body.error)) {
    const code = body.error.code;

    switch (code) {
      case ErrorCode.URL_NOT_FOUND:
        return new AppError(ErrorCode.URL_NOT_FOUND);

      case ErrorCode.URL_EXPIRED:
        return new AppError(ErrorCode.URL_EXPIRED);

      case ErrorCode.URL_INACTIVE:
        return new AppError(ErrorCode.URL_INACTIVE);
    }
  }

  if (status >= 500) {
    return new AppError(ErrorCode.URL_SERVICE_UNAVAILABLE);
  }

  return new AppError(ErrorCode.URL_SERVICE_INVALID_RESPONSE);
}

export async function fetchUrlMetadata(
  shortCode: string,
): Promise<UrlMetadata> {
  const url = new URL(
    `/api/v1/urls/${encodeURIComponent(shortCode)}`,
    env.URL_SERVICE_BASE_URL,
  );

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      throw new AppError(ErrorCode.URL_SERVICE_TIMEOUT);
    }

    throw new AppError(ErrorCode.URL_SERVICE_UNAVAILABLE);
  }

  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new AppError(ErrorCode.URL_SERVICE_INVALID_RESPONSE);
  }

  if (!response.ok) {
    throw mapUpstreamError(response.status, result);
  }

  if (
    !isRecord(result) ||
    result.success !== true ||
    !isUrlMetadata(result.data)
  ) {
    throw new AppError(ErrorCode.URL_SERVICE_INVALID_RESPONSE);
  }

  return result.data;
}
