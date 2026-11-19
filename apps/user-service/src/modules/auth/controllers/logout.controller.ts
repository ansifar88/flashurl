import type { Request, Response } from "express";
import { createSuccessResponse } from "@flashurl/contracts";
import { env } from "../../../config/env";

export function logoutController(_req: Request, res: Response): void {
  const cookieOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
  } as const;

  res.clearCookie(env.ACCESS_TOKEN_COOKIE_NAME, {
    ...cookieOptions,
    path: "/",
  });

  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...cookieOptions,
    path: "/api/v1/users/auth",
  });

  res.status(200).json(createSuccessResponse("Logged out successfully", null));
}
