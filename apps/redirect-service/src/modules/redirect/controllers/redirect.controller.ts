
import type { Request, Response } from "express";
import { AppError, ErrorCode } from "@flashurl/errors";
import { resolveShortCode } from "../services/redirect.service";

export async function handleRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  const shortCode = req.params.shortCode;

  if (
    typeof shortCode !== "string" ||
    !/^[0-9A-Za-z]{10}$/.test(shortCode)
  ) {
    throw new AppError(ErrorCode.INVALID_SHORT_CODE);
  }

  const url = await resolveShortCode(shortCode);

  res.redirect(302, url.originalUrl);
}
