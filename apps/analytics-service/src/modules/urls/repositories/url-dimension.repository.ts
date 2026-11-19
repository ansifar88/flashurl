
import { sequelize } from "../../../infrastructure/database/connection";

import { UrlDimension } from "../models/url-dimension.model";
import { UrlEventState } from "../models/url-event-state.model";

import type {
  UrlCreatedEvent,
  UrlUpdatedEvent,
  UrlDeletedEvent,
} from "@flashurl/contracts";

type UrlUpsertEvent = UrlCreatedEvent | UrlUpdatedEvent;

async function applyUrlLifecycleEvent(
  event: UrlUpsertEvent | UrlDeletedEvent,
  isDelete: boolean,
): Promise<void> {
  const eventDate = new Date(event.occurredAt);

  await sequelize.transaction(async (transaction) => {
    // Create an initial state if this URL has never been processed.
    // A version of zero allows the first real event to be accepted.
    await sequelize.query(
      `
        INSERT INTO url_event_states (
          url_id,
          last_aggregate_version,
          last_event_id,
          is_deleted,
          updated_at
        )
        VALUES (
          :urlId,
          0,
          :eventId,
          false,
          NOW()
        )
        ON DUPLICATE KEY UPDATE url_id = url_id
      `,
      {
        replacements: {
          urlId: event.aggregateId,
          eventId: event.eventId,
        },
        transaction,
      },
    );

    // Lock the state row to serialize concurrent events for this URL.
    const state = await UrlEventState.findByPk(event.aggregateId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!state) {
      throw new Error(
        `URL event state not found for ${event.aggregateId}`,
      );
    }

    // Ignore duplicate and older events.
    if (event.aggregateVersion <= state.lastAggregateVersion) {
      return;
    }

    // A deleted URL must never be resurrected by a delayed upsert.
    if (state.isDeleted && !isDelete) {
      return;
    }

    if (isDelete) {
      const deleteEvent = event as UrlDeletedEvent;

      await UrlDimension.update(
        {
          deletedAt: eventDate,
          updatedAt: eventDate,
        },
        {
          where: {
            urlId: deleteEvent.payload.id,
            shortCode: deleteEvent.payload.shortCode,
          },
          transaction,
        },
      );
    } else {
      const upsertEvent = event as UrlUpsertEvent;
      const { payload } = upsertEvent;

      await UrlDimension.upsert(
        {
          urlId: payload.id,
          shortCode: payload.shortCode,
          userId: payload.userId,
          ownerType: payload.userId ? "registered" : "guest",
          createdAt: new Date(payload.createdAt),
          expiresAt: payload.expiresAt
            ? new Date(payload.expiresAt)
            : null,
          deletedAt: null,
          updatedAt: eventDate,
          lastEventAt: eventDate,
        },
        { transaction },
      );
    }

    // Update the lifecycle state in the same transaction.
    await state.update(
      {
        lastAggregateVersion: event.aggregateVersion,
        lastEventId: event.eventId,
        isDeleted: isDelete || state.isDeleted,
        updatedAt: eventDate,
      },
      { transaction },
    );
  });
}

export async function upsertUrlDimension(
  event: UrlUpsertEvent,
): Promise<void> {
  await applyUrlLifecycleEvent(event, false);
}

export async function deactivateUrlDimension(
  event: UrlDeletedEvent,
): Promise<void> {
  await applyUrlLifecycleEvent(event, true);
}
