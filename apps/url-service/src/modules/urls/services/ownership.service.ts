import { AppError, ErrorCode } from "@flashurl/errors";

import { findUrlByShortCodeAndUserId } from "../repositories/url.repository";

export async function verifyUrlOwnership(
  shortCode: string,
  userId: string,
): Promise<void> {
  const url = await findUrlByShortCodeAndUserId(shortCode, userId);

  if (!url) {
    throw new AppError(ErrorCode.URL_NOT_FOUND);
  }
}
