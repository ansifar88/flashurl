import { Kafka, logLevel, type Producer } from "kafkajs";
import { type UrlClickedEvent } from "@flashurl/contracts";

import { env } from "../../../config/env";

const CLICK_TOPIC = "url.clicked";
const MAX_IN_FLIGHT_PUBLISHES = 100;

const brokers = env.KAFKA_BROKERS.split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No Kafka brokers configured.");
}

const kafka = new Kafka({
  clientId: `${env.KAFKA_CLIENT_ID}-click-events`,
  brokers,
  logLevel: logLevel.ERROR,
  requestTimeout: 5_000,
  enforceRequestTimeout: true,
});

const producer: Producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5,
  retry: {
    retries: 2,
    initialRetryTime: 300,
    maxRetryTime: 2_000,
  },
});

let connected = false;

const inFlightPublishes = new Set<Promise<void>>();

export async function connectClickEventProducer(): Promise<void> {
  if (connected) return;

  await producer.connect();
  connected = true;

  console.log("[Kafka] Click event producer connected.");
}

export function publishClickEvent(event: UrlClickedEvent): void {
  if (!connected) {
    console.error("[Kafka] Click event dropped: producer is not connected.");
    return;
  }

  if (inFlightPublishes.size >= MAX_IN_FLIGHT_PUBLISHES) {
    console.warn(
      "[Kafka] Click event dropped: maximum in-flight publishing limit reached.",
    );
    return;
  }

  let publishTask: Promise<void>;

  publishTask = producer
    .send({
      topic: CLICK_TOPIC,
      acks: -1,
      messages: [
        {
          key: event.aggregateId,
          value: JSON.stringify(event),
          headers: {
            "event-id": event.eventId,
            "event-type": event.eventType,
            "event-version": String(event.eventVersion),
          },
        },
      ],
    })
    .then(() => {
      // Publishing succeeded.
    })
    .catch((error: unknown) => {
      console.error(
        "[Kafka] Failed to publish click event:",
        error instanceof Error ? error.message : error,
      );
    })
    .finally(() => {
      inFlightPublishes.delete(publishTask);
    });

  inFlightPublishes.add(publishTask);
}

export function isClickEventProducerConnected(): boolean {
  return connected;
}

export async function disconnectClickEventProducer(): Promise<void> {
  if (!connected) return;

  // Allow outstanding publishing operations to finish.
  await Promise.allSettled([...inFlightPublishes]);

  await producer.disconnect();
  connected = false;

  console.log("[Kafka] Click event producer disconnected.");
}
