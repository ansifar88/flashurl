
import type { Request, Response } from "express";
import {
  createUrl as createUrlService,
  getUrlByShortCode,
  updateUrl,
  deleteUrl,
} from "../services/url.service";
import { createUrlSchema } from "../validators/url.validator";
import { updateUrlSchema } from "../validators/update-url.validator";
import { AppError, ErrorCode } from "@flashurl/errors";
import { createSuccessResponse } from "@flashurl/contracts";

function validateShortCode(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9A-Za-z]{10}$/.test(value)) {
    throw new AppError(ErrorCode.INVALID_SHORT_CODE);
  }

  return value;
}

export async function handleCreateUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const input = createUrlSchema.parse(req.body);
  const userId = res.locals.userId as string | undefined;

  const result = await createUrlService(input, userId);

  res.status(201).json(
    createSuccessResponse(
      "URL created successfully",
      result,
    ),
  );
}

export async function handleGetUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const result = await getUrlByShortCode(shortCode);

  res.status(200).json(
    createSuccessResponse(
      "URL retrieved successfully",
      result,
    ),
  );
}

export async function handleUpdateUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const input = updateUrlSchema.parse(req.body);
  const userId = res.locals.userId as string;

  const result = await updateUrl(shortCode, input, userId);

  res.status(200).json(
    createSuccessResponse(
      "URL updated successfully",
      result,
    ),
  );
}

export async function handleDeleteUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const shortCode = validateShortCode(req.params.shortCode);
  const userId = res.locals.userId as string;

  const result = await deleteUrl(shortCode, userId);

  res.status(200).json(
    createSuccessResponse(
      "URL deleted successfully",
      result,
    ),
  );
}
