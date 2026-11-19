import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

import { verifyUrlOwnership } from "../services/ownership.service";

export const handleVerifyUrlOwnership: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const shortCode = req.params.shortCode;
    const userId = res.locals.userId;

    if (typeof shortCode !== "string" || typeof userId !== "string") {
      throw new AppError(ErrorCode.VALIDATION_ERROR);
    }

    await verifyUrlOwnership(shortCode, userId);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
