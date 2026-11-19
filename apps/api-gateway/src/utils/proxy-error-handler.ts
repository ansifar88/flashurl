import type { Request, Response } from "express";
import { ErrorCode } from "@flashurl/errors";
import { sendGatewayError } from "./gateway-error";

export function handleProxyError(
  error: Error & { code?: string },
  req: Request,
  res: Response,
  target?: string,
): void {
  const isTimeout =
    error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT";

  const errorCode = isTimeout
    ? ErrorCode.UPSTREAM_SERVICE_TIMEOUT
    : ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE;

  console.error("[API Gateway] Proxy error:", {
    requestId: res.locals.requestId ?? "unknown",
    method: req.method,
    path: req.path,
    target,
    errorCode: error.code,
  });

  sendGatewayError(res, errorCode, res.locals.requestId ?? "unknown");
}
