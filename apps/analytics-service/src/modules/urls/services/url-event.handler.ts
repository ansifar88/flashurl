import {
  UrlEventType,
  type UrlCreatedEvent,
  type UrlUpdatedEvent,
  type UrlDeletedEvent,
} from "@flashurl/contracts";

import {
  upsertUrlDimension,
  deactivateUrlDimension,
} from "../repositories/url-dimension.repository";

export class InvalidUrlEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlEventError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isValidCommonPayload(payload: Record<string, unknown>): boolean {
  return (
    typeof payload.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      payload.id,
    ) &&
    typeof payload.shortCode === "string" &&
    /^[0-9A-Za-z]{10}$/.test(payload.shortCode)
  );
}

function isValidUpsertEvent(value: Record<string, unknown>): value is Record<
  string,
  unknown
> & {
  payload: UrlCreatedEvent["payload"] | UrlUpdatedEvent["payload"];
} {
  const payload = value.payload;

  if (!isRecord(payload)) return false;

  return (
    isValidCommonPayload(payload) &&
    (payload.userId === null ||
      (typeof payload.userId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          payload.userId,
        ))) &&
    isValidDate(payload.createdAt) &&
    (payload.expiresAt === null || isValidDate(payload.expiresAt)) &&
    typeof payload.originalUrl === "string" &&
    (payload.expiresAt === null ||
      Date.parse(payload.expiresAt) > Date.parse(payload.createdAt))
  );
}

function isValidDeleteEvent(value: Record<string, unknown>): value is Record<
  string,
  unknown
> & {
  payload: UrlDeletedEvent["payload"];
} {
  const payload = value.payload;

  return isRecord(payload) && isValidCommonPayload(payload);
}

function isValidEnvelope(value: Record<string, unknown>): boolean {
  return (
    typeof value.eventId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.eventId,
    ) &&
    typeof value.eventType === "string" &&
    value.eventVersion === 1 &&
    Number.isSafeInteger(value.aggregateVersion) &&
    (value.aggregateVersion as number) > 0 &&
    isValidDate(value.occurredAt) &&
    typeof value.aggregateId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.aggregateId,
    )
  );
}

export async function handleUrlEvent(message: string): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    throw new InvalidUrlEventError("Invalid JSON received from Kafka.");
  }

  if (!isRecord(parsed) || !isValidEnvelope(parsed)) {
    throw new InvalidUrlEventError("Invalid URL event envelope.");
  }

  switch (parsed.eventType) {
    case UrlEventType.CREATED:
    case UrlEventType.UPDATED: {
      if (!isValidUpsertEvent(parsed)) {
        throw new InvalidUrlEventError("Invalid URL lifecycle payload.");
      }

      if (parsed.aggregateId !== parsed.payload.id) {
        throw new InvalidUrlEventError("URL event aggregate ID mismatch.");
      }

      await upsertUrlDimension(
        parsed as unknown as UrlCreatedEvent | UrlUpdatedEvent,
      );
      return;
    }

    case UrlEventType.DELETED: {
      if (!isValidDeleteEvent(parsed)) {
        throw new InvalidUrlEventError("Invalid URL deletion payload.");
      }

      if (parsed.aggregateId !== parsed.payload.id) {
        throw new InvalidUrlEventError("URL deletion aggregate ID mismatch.");
      }

      await deactivateUrlDimension(parsed as unknown as UrlDeletedEvent);
      return;
    }

    default:
      throw new InvalidUrlEventError(
        `Unsupported URL event type: ${parsed.eventType}`,
      );
  }
}
