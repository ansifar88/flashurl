import { QueryTypes } from "sequelize";
import { sequelize } from "../../database/connection";

export interface ClaimedOutboxEvent {
  id: string;
  eventId: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: Record<string, unknown>;
  attempts: number;
  occurredAt: Date;
}

interface OutboxEventRow extends ClaimedOutboxEvent {}

export async function claimPendingOutboxEvents(
  limit = 10,
): Promise<ClaimedOutboxEvent[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Outbox batch limit must be a positive integer.");
  }

  return sequelize.transaction(async (transaction) => {
    // Lock eligible rows so concurrent workers skip events
    // that another worker has already claimed.
    const events = await sequelize.query<OutboxEventRow>(
      `
        SELECT
          id,
          event_id AS eventId,
          aggregate_id AS aggregateId,
          event_type AS eventType,
          event_version AS eventVersion,
          payload,
          attempts,
          occurred_at AS occurredAt
        FROM outbox_events
        WHERE status = 'pending'
          AND available_at <= NOW()
        ORDER BY created_at ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED
      `,
      {
        replacements: { limit },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    if (events.length === 0) {
      return [];
    }

    const ids = events.map((event) => event.id);

    await sequelize.query(
      `
        UPDATE outbox_events
        SET
          status = 'processing',
          attempts = attempts + 1,
          updated_at = NOW()
        WHERE id IN (:ids)
          AND status = 'pending'
      `,
      {
        replacements: { ids },
        transaction,
      },
    );

    // attempts is incremented by the UPDATE above.
    return events.map((event) => ({
      ...event,
      attempts: event.attempts + 1,
    }));
  });
}

export async function markOutboxEventPublished(eventId: string): Promise<void> {
  await sequelize.query(
    `
      UPDATE outbox_events
      SET
        status = 'published',
        published_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      WHERE event_id = :eventId
        AND status = 'processing'
    `,
    {
      replacements: { eventId },
    },
  );
}

export async function markOutboxEventFailed(
  eventId: string,
  error: unknown,
  maxAttempts = 5,
): Promise<void> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("Maximum attempts must be a positive integer.");
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  await sequelize.query(
    `
      UPDATE outbox_events
      SET
        status = CASE
          WHEN attempts >= :maxAttempts THEN 'failed'
          ELSE 'pending'
        END,
        available_at = CASE
          WHEN attempts >= :maxAttempts THEN available_at
          ELSE DATE_ADD(
            NOW(),
            INTERVAL LEAST(POW(2, attempts), 3600) SECOND
          )
        END,
        last_error = :lastError,
        updated_at = NOW()
      WHERE event_id = :eventId
        AND status = 'processing'
    `,
    {
      replacements: {
        eventId,
        maxAttempts,
        lastError: errorMessage.slice(0, 16000),
      },
    },
  );
}

export async function recoverStaleOutboxEvents(
  staleAfterSeconds = 60,
): Promise<number> {
  if (!Number.isInteger(staleAfterSeconds) || staleAfterSeconds < 1) {
    throw new RangeError("Stale timeout must be a positive integer.");
  }

  const [, metadata] = await sequelize.query(
    `
      UPDATE outbox_events
      SET
        status = 'pending',
        available_at = NOW(),
        updated_at = NOW(),
        last_error = 'Recovered after worker stopped processing'
      WHERE status = 'processing'
        AND updated_at < DATE_SUB(
          NOW(),
          INTERVAL :staleAfterSeconds SECOND
        )
    `,
    {
      replacements: { staleAfterSeconds },
    },
  );

  return (metadata as { affectedRows?: number }).affectedRows ?? 0;
}
