import { UrlEventType, type UrlClickedEvent } from "@flashurl/contracts";

import { saveClickEvent } from "../repositories/click-event.repository";

export class InvalidClickEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidClickEventError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidClickEvent(value: unknown): value is UrlClickedEvent {
  if (!isRecord(value) || !isRecord(value.payload)) {
    return false;
  }

  const payload = value.payload;

  return (
    typeof value.eventId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.eventId,
    ) &&
    value.eventType === UrlEventType.CLICKED &&
    value.eventVersion === 1 &&
    typeof value.occurredAt === "string" &&
    Number.isFinite(Date.parse(value.occurredAt)) &&
    typeof value.aggregateId === "string" &&
    /^[0-9A-Za-z]{10}$/.test(value.aggregateId) &&
    typeof payload.shortCode === "string" &&
    /^[0-9A-Za-z]{10}$/.test(payload.shortCode) &&
    value.aggregateId === payload.shortCode &&
    (payload.referrer === null || typeof payload.referrer === "string") &&
    (payload.userAgent === null || typeof payload.userAgent === "string") &&
    (payload.ipAddress === null || typeof payload.ipAddress === "string")
  );
}

export async function handleClickEvent(message: string): Promise<void> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message);
  } catch {
    throw new InvalidClickEventError("Invalid JSON received from Kafka.");
  }

  if (!isValidClickEvent(parsed)) {
    throw new InvalidClickEventError(
      "Invalid url.clicked event envelope received from Kafka.",
    );
  }

  const inserted = await saveClickEvent(parsed);

  if (inserted) {
    console.log(
      `[Analytics] Stored click event ${parsed.eventId} for ${parsed.payload.shortCode}.`,
    );
  } else {
    console.log(
      `[Analytics] Duplicate click event ignored: ${parsed.eventId}.`,
    );
  }
}
