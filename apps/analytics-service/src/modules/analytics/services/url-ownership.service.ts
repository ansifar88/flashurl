import { AppError, ErrorCode } from "@flashurl/errors";

import { env } from "../../../config/env";

export async function verifyAnalyticsUrlOwnership(
  shortCode: string,
  accessToken: string,
): Promise<void> {
  const baseUrl = env.URL_SERVICE_INTERNAL_URL.replace(/\/+$/, "");

  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}/internal/urls/${encodeURIComponent(shortCode)}/ownership`,
      {
        method: "GET",
        headers: {
          Cookie: `${env.ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`,
        },
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch {
    throw new Error("URL ownership service is unavailable.");
  }

  if (response.status === 404) {
    throw new AppError(ErrorCode.URL_NOT_FOUND);
  }

  if (response.status === 401) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  if (response.status !== 204) {
    throw new Error(
      `URL ownership verification failed with status ${response.status}.`,
    );
  }
}
