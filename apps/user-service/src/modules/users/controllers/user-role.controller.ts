import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createSuccessResponse } from "@flashurl/contracts";

import { getUserAuthorizationContext } from "../services/user-role.service";

export const handleGetUserRole: RequestHandler = async (_req, res, next) => {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== "string" || !userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const data = await getUserAuthorizationContext(userId);

    res
      .status(200)
      .json(
        createSuccessResponse(
          "User authorization context retrieved successfully",
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};
