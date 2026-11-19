import type { RequestHandler } from "express";
import { ErrorCode } from "@flashurl/errors";

import { env } from "../config/env";
import { sendGatewayError } from "../utils/gateway-error";

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

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
  const requestId = res.locals.requestId ?? "unknown";
  const accessToken = getAccessToken(req.headers.cookie);

  if (!accessToken) {
    sendGatewayError(res, ErrorCode.UNAUTHORIZED, requestId);
    return;
  }

  try {
    const { jwtVerify } = await import("jose");

    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      payload.token_use !== "access" ||
      typeof payload.sub !== "string" ||
      !payload.sub
    ) {
      sendGatewayError(res, ErrorCode.UNAUTHORIZED, requestId);
      return;
    }

    res.locals.userId = payload.sub;

    next();
  } catch {
    sendGatewayError(res, ErrorCode.UNAUTHORIZED, requestId);
  }
};
