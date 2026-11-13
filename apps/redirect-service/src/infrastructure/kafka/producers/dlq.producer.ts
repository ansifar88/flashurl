import { Kafka, logLevel, type Producer } from "kafkajs";

import { env } from "../../../config/env";

const DLQ_TOPIC = "flashurl.dlq";

const brokers = env.KAFKA_BROKERS.split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No Kafka brokers configured.");
}

const kafka = new Kafka({
  clientId: `${env.KAFKA_CLIENT_ID}-dlq`,
  brokers,
  logLevel: logLevel.ERROR,
});

const producer: Producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 1,
});

let connected = false;

export async function connectDlqProducer(): Promise<void> {
  if (connected) return;

  await producer.connect();
  connected = true;

  console.log("[Kafka] DLQ producer connected.");
}

export interface DlqMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  originalKey: string | null;
  originalValue: string;
  error: string;
  failedAt: string;
}

export async function publishToDlq(message: DlqMessage): Promise<void> {
  if (!connected) {
    throw new Error("DLQ producer is not connected.");
  }

  await producer.send({
    topic: DLQ_TOPIC,
    acks: -1,
    messages: [
      {
        key: message.originalKey ?? undefined,
        value: JSON.stringify(message),
        headers: {
          "original-topic": message.originalTopic,
          "original-partition": String(message.originalPartition),
          "original-offset": message.originalOffset,
          "failure-reason": message.error,
        },
      },
    ],
  });

  console.log(
    `[Kafka] Published failed event to ${DLQ_TOPIC}: ` +
      `${message.originalTopic}[${message.originalPartition}] ` +
      `offset ${message.originalOffset}`,
  );
}

export async function disconnectDlqProducer(): Promise<void> {
  if (!connected) return;

  await producer.disconnect();
  connected = false;

  console.log("[Kafka] DLQ producer disconnected.");
}
