import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

import { env } from "../config/env";

interface VerifiedAccessToken {
  userId: string;
}

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  const { jwtVerify } = await import("jose");

  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      payload.token_use !== "access" ||
      typeof payload.sub !== "string" ||
      !payload.sub
    ) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(ErrorCode.UNAUTHORIZED);
  }
}

function getAccessToken(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${env.ACCESS_TOKEN_COOKIE_NAME}=`));

  if (!cookie) return undefined;

  const separatorIndex = cookie.indexOf("=");

  return separatorIndex === -1 ? undefined : cookie.slice(separatorIndex + 1);
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const accessToken = getAccessToken(req.headers.cookie);

    if (!accessToken) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const { userId } = await verifyAccessToken(accessToken);

    res.locals.userId = userId;
    res.locals.accessToken = accessToken;

    next();
  } catch (error) {
    next(error);
  }
};
