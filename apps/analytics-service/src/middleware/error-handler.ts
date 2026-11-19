
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createErrorResponse } from "@flashurl/contracts";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(error);
  }

  const requestId = res.locals.requestId ?? "unknown";

  let statusCode = 500;
  let code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = "An unexpected error occurred";
  let details: unknown | null = null;

  const parserError = error as { type?: string };

  if (parserError.type === "entity.too.large") {
    statusCode = 413;
    code = ErrorCode.PAYLOAD_TOO_LARGE;
    message = "Request body exceeds the allowed size";
  } else if (parserError.type === "entity.parse.failed") {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = "Invalid JSON request body";
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = "Request validation failed";
    details = error.flatten().fieldErrors;
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  } else {
    console.error({
      message: "Unhandled analytics error",
      requestId,
      method: req.method,
      path: req.originalUrl,
      error: error instanceof Error ? error.stack : error,
    });
  }

  res.locals.errorCode = code;

  res.status(statusCode).json(
    createErrorResponse({
      message,
      code,
      requestId,
      details,
    }),
  );
};
