
import type { Response } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createErrorResponse } from "@flashurl/contracts";

export function sendGatewayError(
  res: Response,
  code: ErrorCode,
  requestId: string,
  message?: string,
): void {
  const error = new AppError(code);

  if (res.headersSent || res.writableEnded || res.destroyed) {
    return;
  }

  res.status(error.statusCode).json(
    createErrorResponse({
      message: message ?? error.message,
      code: error.code,
      requestId,
    }),
  );
}
