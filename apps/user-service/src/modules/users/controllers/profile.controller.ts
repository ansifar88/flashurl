import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createSuccessResponse } from "@flashurl/contracts";
import { findUserById } from "../repositories/user.repository";

export async function profileController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = res.locals.userId as string;

    const user = await findUserById(userId);

    if (!user || !user.isActive) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    res.status(200).json(
      createSuccessResponse("Profile retrieved successfully", {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      }),
    );
  } catch (error) {
    next(error);
  }
}
