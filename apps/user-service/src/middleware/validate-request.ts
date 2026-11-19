
import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError, ErrorCode } from "@flashurl/errors";

export function validateRequest(
  schema: z.ZodType
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError(ErrorCode.VALIDATION_ERROR));
      return;
    }

    req.body = result.data;
    next();
  };
}
