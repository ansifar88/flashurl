import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { env } from "../config/env";
import { verifyAccessToken } from "../modules/auth/utils/token";

export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[env.ACCESS_TOKEN_COOKIE_NAME];

    // No token means guest access.
    if (!accessToken) {
      return next();
    }

    if (typeof accessToken !== "string") {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const { userId } = await verifyAccessToken(accessToken);

    res.locals.userId = userId;

    next();
  } catch (error) {
    next(error);
  }
};
