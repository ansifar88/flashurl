import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createSuccessResponse } from "@flashurl/contracts";

import { env } from "../../../config/env";
import { refreshUserSession } from "../services/auth.service";

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken || typeof refreshToken !== "string") {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const result = await refreshUserSession(refreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
    } as const;

    res.cookie(env.ACCESS_TOKEN_COOKIE_NAME, result.accessToken, {
      ...cookieOptions,
      maxAge: env.JWT_ACCESS_TOKEN_TTL * 1000,
      path: "/",
    });

    res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, {
      ...cookieOptions,
      maxAge: env.JWT_REFRESH_TOKEN_TTL * 1000,
      path: "/api/v1/users/auth",
    });

    res
      .status(200)
      .json(createSuccessResponse("Session refreshed successfully", null));
  } catch (error) {
    next(error);
  }
}
