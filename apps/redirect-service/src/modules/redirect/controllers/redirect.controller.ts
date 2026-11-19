import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

import { AppError, ErrorCode } from "@flashurl/errors";

import { UrlEventType, type UrlClickedEvent } from "@flashurl/contracts";

import { resolveShortCode } from "../services/redirect.service";

import { publishClickEvent } from "../../../infrastructure/kafka/producers/click-event.producer";

export async function handleRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  const shortCode = req.params.shortCode;

  if (typeof shortCode !== "string" || !/^[0-9A-Za-z]{10}$/.test(shortCode)) {
    throw new AppError(ErrorCode.INVALID_SHORT_CODE);
  }

  // 1. Resolve and validate the short URL.
  const url = await resolveShortCode(shortCode);

  // 2. Return the redirect immediately.
  res.redirect(302, url.originalUrl);

  // 3. Prepare click event metadata.
  const clickEvent: UrlClickedEvent = {
    eventId: randomUUID(),
    eventType: UrlEventType.CLICKED,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    aggregateId: shortCode,
    payload: {
      shortCode,
      referrer: req.get("referer") ?? null,
      userAgent: req.get("user-agent") ?? null,
      ipAddress: null,
    },
  };

  // 4. Publish asynchronously without awaiting Kafka.
  publishClickEvent(clickEvent);
}
