
import type { ErrorRequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const requestId = res.locals.requestId as string | undefined;

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Request validation failed",
        details: error.flatten().fieldErrors,
        requestId,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    });
    return;
  }

  console.error({
    message: "Unhandled redirect error",
    method: req.method,
    path: req.originalUrl,
    requestId,
    error: error instanceof Error ? error.stack : error,
  });

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      requestId,
    },
  });
};
