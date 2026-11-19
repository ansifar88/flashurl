import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { env } from "../config/env";
import { verifyAccessToken } from "../modules/auth/utils/token";

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[env.ACCESS_TOKEN_COOKIE_NAME];

    if (!accessToken || typeof accessToken !== "string") {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    let payload;

    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    res.locals.userId = payload.userId;

    next();
  } catch (error) {
    next(error);
  }
};
