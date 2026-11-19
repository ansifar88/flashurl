
import type { ErrorRequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

function getValidationDetails(error: unknown): unknown | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("issues" in error && Array.isArray(error.issues)) {
    return error.issues.map((issue: {
      path?: unknown[];
      message?: string;
      code?: string;
    }) => ({
      field: issue.path?.join(".") ?? "",
      message: issue.message ?? "Invalid value.",
      code: issue.code ?? "VALIDATION_ERROR",
    }));
  }

  return null;
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(error);
  }

  const parserError = error as {
    type?: string;
  };

  const requestId = res.locals.requestId ?? "unknown";

  let statusCode: number;
  let code: string;
  let message: string;
  let details: unknown | null = null;

  if (parserError.type === "entity.too.large") {
    statusCode = 413;
    code = ErrorCode.PAYLOAD_TOO_LARGE;
    message = "Request body exceeds the 1 MB limit.";
  } else if (parserError.type === "entity.parse.failed") {
    statusCode = 400;
    code = ErrorCode.VALIDATION_ERROR;
    message = "Invalid JSON request body.";
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  } else {
    const validationDetails = getValidationDetails(error);

    if (validationDetails) {
      statusCode = 400;
      code = ErrorCode.VALIDATION_ERROR;
      message = "Request validation failed.";
      details = validationDetails;
    } else {
      const appError = new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
      );

      statusCode = appError.statusCode;
      code = appError.code;
      message = appError.message;

      console.error("[API Gateway] Unexpected error:", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  res.locals.errorCode = code;

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code,
      details,
      requestId,
    },
    meta: null,
  });
};
