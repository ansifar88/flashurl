import { Kafka, logLevel, type Producer } from "kafkajs";

import { env } from "../../../config/env";

export interface KafkaEvent {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateVersion: number;
  occurredAt: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

const brokers = env.KAFKA_BROKERS.split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("At least one Kafka broker must be configured.");
}

const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers,
  logLevel: logLevel.ERROR,
});

const producer: Producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5,
});

let connected = false;
let connectionPromise: Promise<void> | null = null;

export async function connectKafkaProducer(): Promise<void> {
  if (connected) return;

  if (!connectionPromise) {
    connectionPromise = producer
      .connect()
      .then(() => {
        connected = true;
        console.log("Kafka producer connected.");
      })
      .catch((error: unknown) => {
        throw error;
      })
      .finally(() => {
        connectionPromise = null;
      });
  }

  await connectionPromise;
}

export async function publishKafkaEvent(event: KafkaEvent): Promise<void> {
  if (!connected) {
    throw new Error("Kafka producer is not connected.");
  }

  await producer.send({
    topic: event.eventType,
    acks: -1,
    messages: [
      {
        // Preserve ordering for events belonging to the same URL.
        key: event.aggregateId,
        value: JSON.stringify(event),
        headers: {
          "event-id": event.eventId,
          "event-version": String(event.eventVersion),
          "aggregate-version": String(event.aggregateVersion),
        },
      },
    ],
  });
}

export async function disconnectKafkaProducer(): Promise<void> {
  if (!connected) return;

  await producer.disconnect();
  connected = false;

  console.log("Kafka producer disconnected.");
}

export async function checkKafkaHealth(): Promise<boolean> {
  const admin = kafka.admin();

  try {
    await admin.connect();

    await admin.describeCluster();

    return true;
  } catch {
    return false;
  } finally {
    await admin.disconnect().catch(() => undefined);
  }
}
