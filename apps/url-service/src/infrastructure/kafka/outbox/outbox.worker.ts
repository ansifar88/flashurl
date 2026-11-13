
import {
  claimPendingOutboxEvents,
  markOutboxEventPublished,
  markOutboxEventFailed,
  recoverStaleOutboxEvents,
} from "./outbox.repository";

import {
  connectKafkaProducer,
  publishKafkaEvent,
  disconnectKafkaProducer,
} from "../producers/producer";

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 10;

let running = false;
let workerPromise: Promise<void> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processEvent(
  event: Awaited<ReturnType<typeof claimPendingOutboxEvents>>[number],
): Promise<void> {
  try {
    await publishKafkaEvent({
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      occurredAt: new Date(event.occurredAt).toISOString(),
      aggregateId: event.aggregateId,
      payload: event.payload,
    });

    await markOutboxEventPublished(event.eventId);

    console.log(
      `[Outbox] Published ${event.eventType} (${event.eventId})`,
    );
  } catch (error) {
    console.error(
      `[Outbox] Failed to publish ${event.eventId}:`,
      error,
    );

    try {
      await markOutboxEventFailed(event.eventId, error);
    } catch (failureError) {
      console.error(
        `[Outbox] Failed to update event status ${event.eventId}:`,
        failureError,
      );
    }
  }
}

async function runWorker(): Promise<void> {
  // Recover abandoned events when this worker starts.
  try {
    const recovered = await recoverStaleOutboxEvents(300);

    if (recovered > 0) {
      console.log(`[Outbox] Recovered ${recovered} stale events.`);
    }
  } catch (error) {
    console.error("[Outbox] Initial stale-event recovery failed:", error);
  }

  while (running) {
    try {
      await connectKafkaProducer();

      const events = await claimPendingOutboxEvents(BATCH_SIZE);

      // Process sequentially to keep processing predictable.
      for (const event of events) {
        if (!running) break;

        await processEvent(event);
      }
    } catch (error) {
      console.error("[Outbox] Worker cycle failed:", error);
    }

    if (running) {
      await delay(POLL_INTERVAL_MS);
    }
  }
}

export function startOutboxWorker(): () => Promise<void> {
  if (running) {
    throw new Error("Outbox worker is already running.");
  }

  running = true;

  workerPromise = runWorker();

  console.log("[Outbox] Worker started.");

  return async function stopOutboxWorker(): Promise<void> {
    if (!running) return;

    running = false;

    // Wait for the current processing cycle to finish.
    await workerPromise;
    workerPromise = null;

    await disconnectKafkaProducer();

    console.log("[Outbox] Worker stopped.");
  };
}
