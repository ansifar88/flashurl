
import { UniqueConstraintError } from "sequelize";

import { env } from "../../../config/env";
import { generateShortCode } from "../../../utils/short-code";

import {
  createUrlRecord,
  findUrlByShortCode,
  updateUrlRecord,
  deactivateUrlRecord,
} from "../repositories/url.repository";

import { createOutboxEvent } from "../repositories/outbox.repository";

import type { CreateUrlInput } from "../validators/url.validator";
import type { UpdateUrlInput } from "../validators/update-url.validator";

import { AppError, ErrorCode } from "@flashurl/errors";
import { sequelize } from "../../../infrastructure/database/connection";
import { UrlEventType } from "@flashurl/contracts";

const MAX_RETRIES = 5;

export async function createUrl(input: CreateUrlInput) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const shortCode = generateShortCode();

    try {
      const result = await sequelize.transaction(async (transaction) => {
        const url = await createUrlRecord(
          {
            shortCode,
            originalUrl: input.originalUrl,
            expiresAt: input.expiresAt
              ? new Date(input.expiresAt)
              : null,
          },
          transaction,
        );

        await createOutboxEvent(
          {
            aggregateId: url.id,
            eventType: UrlEventType.CREATED,
            payload: {
              id: url.id,
              shortCode: url.shortCode,
              originalUrl: url.originalUrl,
              expiresAt: url.expiresAt?.toISOString() ?? null,
            },
          },
          transaction,
        );

        return url;
      });

      return {
        id: result.id,
        shortCode: result.shortCode,
        shortUrl: `${env.SHORT_URL_BASE_URL}/${result.shortCode}`,
        originalUrl: result.originalUrl,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      if (error instanceof UniqueConstraintError && attempt < MAX_RETRIES) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(ErrorCode.SHORT_CODE_GENERATION_FAILED);
}

export async function getUrlByShortCode(shortCode: string) {
  const url = await findUrlByShortCode(shortCode);

  if (!url) {
    throw new AppError(ErrorCode.URL_NOT_FOUND);
  }

  if (!url.isActive) {
    throw new AppError(ErrorCode.URL_INACTIVE);
  }

  if (url.expiresAt && url.expiresAt.getTime() <= Date.now()) {
    throw new AppError(ErrorCode.URL_EXPIRED);
  }

  return {
    id: url.id,
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    expiresAt: url.expiresAt,
    isActive: url.isActive,
  };
}

export async function updateUrl(shortCode: string, input: UpdateUrlInput) {
  return sequelize.transaction(async (transaction) => {
    const existingUrl = await findUrlByShortCode(shortCode, transaction);

    if (!existingUrl) {
      throw new AppError(ErrorCode.URL_NOT_FOUND);
    }

    if (!existingUrl.isActive) {
      throw new AppError(ErrorCode.URL_INACTIVE);
    }

    if (existingUrl.expiresAt && existingUrl.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ErrorCode.URL_EXPIRED);
    }

    const updateData: {
      originalUrl?: string;
      expiresAt?: Date | null;
    } = {};

    if (input.originalUrl !== undefined) {
      updateData.originalUrl = input.originalUrl;
    }

    if (input.expiresAt !== undefined) {
      updateData.expiresAt = input.expiresAt
        ? new Date(input.expiresAt)
        : null;
    }

    await updateUrlRecord(shortCode, updateData, transaction);

    const updatedUrl = await findUrlByShortCode(shortCode, transaction);

    if (!updatedUrl) {
      throw new AppError(ErrorCode.URL_NOT_FOUND);
    }

    await createOutboxEvent(
      {
        aggregateId: updatedUrl.id,
        eventType: UrlEventType.UPDATED,
        payload: {
          id: updatedUrl.id,
          shortCode: updatedUrl.shortCode,
          originalUrl: updatedUrl.originalUrl,
          expiresAt: updatedUrl.expiresAt?.toISOString() ?? null,
        },
      },
      transaction,
    );

    return {
      id: updatedUrl.id,
      shortCode: updatedUrl.shortCode,
      originalUrl: updatedUrl.originalUrl,
      expiresAt: updatedUrl.expiresAt,
      isActive: updatedUrl.isActive,
    };
  });
}

export async function deleteUrl(shortCode: string) {
  return sequelize.transaction(async (transaction) => {
    const existingUrl = await findUrlByShortCode(shortCode, transaction);

    if (!existingUrl) {
      throw new AppError(ErrorCode.URL_NOT_FOUND);
    }

    if (!existingUrl.isActive) {
      throw new AppError(ErrorCode.URL_INACTIVE);
    }

    await deactivateUrlRecord(shortCode, transaction);

    await createOutboxEvent(
      {
        aggregateId: existingUrl.id,
        eventType: UrlEventType.DELETED,
        payload: {
          id: existingUrl.id,
          shortCode: existingUrl.shortCode,
        },
      },
      transaction,
    );

    return {
      id: existingUrl.id,
      shortCode: existingUrl.shortCode,
      isActive: false,
    };
  });
}
