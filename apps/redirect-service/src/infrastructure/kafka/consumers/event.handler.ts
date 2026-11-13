
import { UrlEventType } from "@flashurl/contracts";
import { redis } from "../../redis/connection";

export class InvalidUrlEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlEventError";
  }
}

export class RetryableUrlEventError extends Error {
  public readonly originalError: unknown;

  constructor(message: string, originalError: unknown) {
    super(message);
    this.name = "RetryableUrlEventError";
    this.originalError = originalError;
  }
}

interface UrlEventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  aggregateId: string;
  payload: {
    id: string;
    shortCode: string;
    originalUrl?: string;
    expiresAt?: string | null;
  };
}

const CACHE_PREFIX = "flashurl:redirect:";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidUrlEvent(value: unknown): value is UrlEventEnvelope {
  if (!isRecord(value) || !isRecord(value.payload)) {
    return false;
  }

  const payload = value.payload;

  if (
    typeof value.eventId !== "string" ||
    !value.eventId.trim() ||
    typeof value.eventType !== "string" ||
    !Object.values(UrlEventType).includes(
      value.eventType as (typeof UrlEventType)[keyof typeof UrlEventType],
    ) ||
    !Number.isInteger(value.eventVersion) ||
    (value.eventVersion as number) < 1 ||
    typeof value.occurredAt !== "string" ||
    !Number.isFinite(Date.parse(value.occurredAt)) ||
    typeof value.aggregateId !== "string" ||
    !value.aggregateId.trim() ||
    typeof payload.id !== "string" ||
    !payload.id.trim() ||
    typeof payload.shortCode !== "string" ||
    !/^[0-9A-Za-z]{10}$/.test(payload.shortCode)
  ) {
    return false;
  }

  if (
    value.eventType === UrlEventType.CREATED ||
    value.eventType === UrlEventType.UPDATED
  ) {
    if (
      typeof payload.originalUrl !== "string" ||
      (payload.expiresAt !== null &&
        typeof payload.expiresAt !== "string")
    ) {
      return false;
    }

    if (
      typeof payload.expiresAt === "string" &&
      !Number.isFinite(Date.parse(payload.expiresAt))
    ) {
      return false;
    }
  }

  return true;
}

export async function handleUrlEvent(message: string): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    throw new InvalidUrlEventError("Invalid JSON received from Kafka.");
  }

  if (!isValidUrlEvent(parsed)) {
    throw new InvalidUrlEventError(
      "Invalid URL event envelope received from Kafka.",
    );
  }

  const { eventId, eventType, payload } = parsed;

  switch (eventType) {
    case UrlEventType.CREATED: {
      console.log(
        `[Kafka] Processed ${eventType} (${eventId}). No cache invalidation needed.`,
      );
      return;
    }

    case UrlEventType.UPDATED:
    case UrlEventType.DELETED: {
      const cacheKey = `${CACHE_PREFIX}${payload.shortCode}`;

      try {
        await redis.del(cacheKey);
      } catch (error) {
        throw new RetryableUrlEventError(
          `Redis cache invalidation failed for ${payload.shortCode}.`,
          error,
        );
      }

      console.log(
        `[Kafka] Invalidated cache for ${payload.shortCode} (${eventType}).`,
      );
      return;
    }

    default:
      throw new InvalidUrlEventError(
        `Unsupported URL event type: ${eventType}`,
      );
  }
}
