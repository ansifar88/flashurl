
import type { Request, Response } from "express";
import {
  createUrl as createUrlService,
  getUrlByShortCode,
  updateUrl,
  deleteUrl
} from "../services/url.service";
import { createUrlSchema } from "../validators/url.validator";
import { updateUrlSchema } from "../validators/update-url.validator";
import { AppError, ErrorCode } from "@flashurl/errors";

function validateShortCode(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9A-Za-z]{10}$/.test(value)) {
    throw new AppError(ErrorCode.INVALID_SHORT_CODE);
  }

  return value;
}

export async function handleCreateUrl(
  req: Request,
  res: Response
): Promise<void> {
  const input = createUrlSchema.parse(req.body);
  const result = await createUrlService(input);

  res.status(201).json({
    success: true,
    data: result
  });
}

export async function handleGetUrl(
  req: Request,
  res: Response
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const result = await getUrlByShortCode(shortCode);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function handleUpdateUrl(
  req: Request,
  res: Response
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const input = updateUrlSchema.parse(req.body);
  const result = await updateUrl(shortCode, input);

  res.status(200).json({
    success: true,
    data: result
  });
}

export async function handleDeleteUrl(
  req: Request,
  res: Response
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const result = await deleteUrl(shortCode);

  res.status(200).json({
    success: true,
    data: result
  });
}
