
import { AppError, ErrorCode } from "@flashurl/errors";

import { env } from "../../../config/env";

export type UserRole = "user" | "admin";

interface UserAuthorizationData {
  userId: string;
  role: UserRole;
}

function isValidAuthorizationResponse(
  value: unknown,
): value is {
  success: true;
  data: UserAuthorizationData;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("success" in value) || value.success !== true) {
    return false;
  }

  if (!("data" in value)) {
    return false;
  }

  const data = value.data;

  return (
    typeof data === "object" &&
    data !== null &&
    "userId" in data &&
    typeof data.userId === "string" &&
    data.userId.length > 0 &&
    "role" in data &&
    (data.role === "user" || data.role === "admin")
  );
}

export async function getCurrentUserRole(
  accessToken: string,
): Promise<UserAuthorizationData> {
  const baseUrl = env.USER_SERVICE_INTERNAL_URL.replace(/\/+$/, "");

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/internal/users/me/role`, {
      method: "GET",
      headers: {
        Cookie: `${env.ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AppError(ErrorCode.UPSTREAM_SERVICE_TIMEOUT);
    }

    throw new AppError(ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE);
  }

  if (response.status === 401) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  if (!response.ok) {
    throw new AppError(ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE);
  }

  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new AppError(ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE);
  }

  if (!isValidAuthorizationResponse(result)) {
    throw new AppError(ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE);
  }

  return result.data;
}
