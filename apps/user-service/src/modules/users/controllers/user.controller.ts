import type { Request, Response, NextFunction } from "express";
import { createSuccessResponse } from "@flashurl/contracts";
import { registerUser } from "../services/user.service";

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await registerUser(req.body);

    res
      .status(201)
      .json(createSuccessResponse("User registered successfully", user));
  } catch (error) {
    next(error);
  }
}
