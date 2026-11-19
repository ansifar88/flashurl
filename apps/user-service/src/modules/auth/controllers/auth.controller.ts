import type { Request, Response, NextFunction } from "express";
import { createSuccessResponse } from "@flashurl/contracts";
import { loginUser } from "../services/auth.service";
import { env } from "../../../config/env";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginUser(req.body);

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

    res.status(200).json(
      createSuccessResponse("Login successful", {
        user: result.user,
      }),
    );
  } catch (error) {
    next(error);
  }
}
