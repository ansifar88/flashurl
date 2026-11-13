
import { randomUUID } from "node:crypto";
import type { Transaction } from "sequelize";

import { OutboxEvent } from "../models/outbox-event.model";

interface CreateOutboxEventInput {
  aggregateId: string;
  eventType: string;
  eventVersion?: number;
  payload: Record<string, unknown>;
}

export async function createOutboxEvent(
  data: CreateOutboxEventInput,
  transaction: Transaction,
): Promise<OutboxEvent> {
  return OutboxEvent.create(
    {
      eventId: randomUUID(),
      aggregateId: data.aggregateId,
      eventType: data.eventType,
      eventVersion: data.eventVersion ?? 1,
      payload: data.payload,
      occurredAt: new Date(),
      status: "pending",
      attempts: 0,
      availableAt: new Date(),
      publishedAt: null,
      lastError: null,
    },
    { transaction },
  );
}
