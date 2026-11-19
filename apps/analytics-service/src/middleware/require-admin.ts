
import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

import { getCurrentUserRole } from "../modules/analytics/services/user-authorization.service";

export const requireAdmin: RequestHandler = async (_req, res, next) => {
  try {
    const accessToken = res.locals.accessToken;
    const authenticatedUserId = res.locals.userId;

    if (
      typeof accessToken !== "string" ||
      !accessToken ||
      typeof authenticatedUserId !== "string" ||
      !authenticatedUserId
    ) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const authorization = await getCurrentUserRole(accessToken);

    // The identity returned by User Service must match
    // the identity verified by Analytics Service.
    if (authorization.userId !== authenticatedUserId) {
      throw new AppError(ErrorCode.UPSTREAM_SERVICE_UNAVAILABLE);
    }

    if (authorization.role !== "admin") {
      throw new AppError(ErrorCode.FORBIDDEN);
    }

    res.locals.userId = authorization.userId;
    res.locals.userRole = authorization.role;

    next();
  } catch (error) {
    next(error);
  }
};
