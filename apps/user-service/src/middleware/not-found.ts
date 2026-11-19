import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

export const notFoundMiddleware: RequestHandler = (
  _req,
  _res,
  next
) => {
  next(new AppError(ErrorCode.API_ROUTE_NOT_FOUND));
};