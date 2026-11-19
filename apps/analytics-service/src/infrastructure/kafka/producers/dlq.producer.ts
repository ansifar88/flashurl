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
  requestTimeout: 5_000,
  enforceRequestTimeout: true,
});

const producer: Producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 1,
});

let connected = false;

export interface AnalyticsDlqMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  originalKey: string | null;
  originalValue: string;
  error: string;
  failedAt: string;
}

export async function connectAnalyticsDlqProducer(): Promise<void> {
  if (connected) return;

  await producer.connect();
  connected = true;

}

export async function publishAnalyticsToDlq(
  message: AnalyticsDlqMessage,
): Promise<void> {
  if (!connected) {
    throw new Error("Analytics DLQ producer is not connected.");
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
          "source-service": env.SERVICE_NAME,
        },
      },
    ],
  });
}

export async function disconnectAnalyticsDlqProducer(): Promise<void> {
  if (!connected) return;

  await producer.disconnect();
  connected = false;

  console.log("[Kafka] Analytics DLQ producer disconnected.");
}
