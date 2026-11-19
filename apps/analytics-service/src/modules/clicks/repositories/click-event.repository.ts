
import { UniqueConstraintError } from "sequelize";
import type { UrlClickedEvent } from "@flashurl/contracts";

import { ClickEvent } from "../models/click-event.model";

export async function saveClickEvent(
  event: UrlClickedEvent,
): Promise<boolean> {
  try {
    await ClickEvent.create({
      eventId: event.eventId,
      shortCode: event.payload.shortCode,
      referrer: event.payload.referrer,
      userAgent: event.payload.userAgent,
      clickedAt: new Date(event.occurredAt),
    });

    return true;
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return false;
    }

    throw error;
  }
}
