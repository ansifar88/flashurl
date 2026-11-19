import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { env } from "../config/env";

type UserRole = "user" | "admin";

interface UserAuthorizationResponse {
  success: boolean;
  data: {
    userId: string;
    role: UserRole;
  };
}

export const requireAdmin: RequestHandler = async (_req, res, next) => {
  try {
    const accessToken = res.locals.accessToken;

    if (typeof accessToken !== "string" || !accessToken) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const baseUrl = env.USER_SERVICE_INTERNAL_URL.replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/internal/users/me/role`, {
      method: "GET",
      headers: {
        Cookie: `${env.ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    if (!response.ok) {
      throw new Error(
        `User authorization service failed with status ${response.status}`,
      );
    }

    const result = (await response.json()) as UserAuthorizationResponse;

    if (
      !result.success ||
      !result.data ||
      (result.data.role !== "admin" && result.data.role !== "user")
    ) {
      throw new Error("Invalid user authorization response.");
    }

    if (result.data.role !== "admin") {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    res.locals.userRole = result.data.role;

    next();
  } catch (error) {
    next(error);
  }
};
