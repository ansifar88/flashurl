import { Kafka, logLevel, type Consumer } from "kafkajs";
import { UrlEventType } from "@flashurl/contracts";
import { env } from "../../../config/env";

import {
  handleUrlEvent,
  InvalidUrlEventError,
  RetryableUrlEventError,
} from "./event.handler";

import { publishToDlq, type DlqMessage } from "../producers/dlq.producer";

const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 2_000;

const brokers = env.KAFKA_BROKERS.split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No Kafka brokers configured.");
}

const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers,
  logLevel: logLevel.ERROR,
  requestTimeout: 5_000,
  enforceRequestTimeout: true,
});

const consumer: Consumer = kafka.consumer({
  groupId: env.KAFKA_CONSUMER_GROUP_ID,
});
const admin = kafka.admin();

let connected = false;
let running = false;
let adminConnected = false;

function getRetryDelay(attempt: number): number {
  return Math.min(
    INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
    MAX_RETRY_DELAY_MS,
  );
}

async function waitWithHeartbeat(
  delayMs: number,
  heartbeat: () => Promise<void>,
): Promise<void> {
  let remaining = delayMs;

  while (remaining > 0) {
    const interval = Math.min(remaining, HEARTBEAT_INTERVAL_MS);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, interval);
    });

    await heartbeat();
    remaining -= interval;
  }
}

type PausePartition = () => void;

async function processWithRetry(
  message: string,
  heartbeat: () => Promise<void>,
  pausePartition: PausePartition,
): Promise<void> {
  let attempt = 0;

  while (true) {
    try {
      await handleUrlEvent(message);
      return;
    } catch (error) {
      if (error instanceof InvalidUrlEventError) {
        throw error;
      }

      if (!(error instanceof RetryableUrlEventError)) {
        throw error;
      }

      attempt++;
      pausePartition();

      const delay = getRetryDelay(attempt);

      console.error(
        `[Kafka] Redis unavailable. Retry ${attempt} in ${delay}ms:`,
        error.originalError instanceof Error
          ? error.originalError.message
          : error.message,
      );

      await waitWithHeartbeat(delay, heartbeat);
    }
  }
}

async function publishToDlqWithRetry(
  message: DlqMessage,
  heartbeat: () => Promise<void>,
  pausePartition: PausePartition,
): Promise<void> {
  let attempt = 0;

  while (true) {
    try {
      await publishToDlq(message);
      return;
    } catch (error) {
      attempt++;
      pausePartition();

      const delay = getRetryDelay(attempt);

      console.error(
        `[Kafka] DLQ publishing failed. Retry ${attempt} in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );

      await waitWithHeartbeat(delay, heartbeat);
    }
  }
}

export async function connectKafkaConsumer(): Promise<void> {
  if (connected) return;

  await consumer.connect();

  try {
    await consumer.subscribe({
      topics: [
        UrlEventType.CREATED,
        UrlEventType.UPDATED,
        UrlEventType.DELETED,
      ],
      fromBeginning: false,
    });

    connected = true;

    console.log("[Kafka] Redirect consumer connected and subscribed.");
  } catch (error) {
    await consumer.disconnect();
    throw error;
  }
}
let starting = false;

export async function startKafkaConsumer(): Promise<void> {
  if (!connected) {
    throw new Error("Kafka consumer must be connected before starting.");
  }

  if (running || starting) return;

  starting = true;

  try {
    await consumer.run({
      autoCommit: false,

      eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
        const originalValue = message.value?.toString() ?? "";

        let resumePartition: (() => void) | undefined;

        const pauseCurrentPartition = (): void => {
          if (!resumePartition) {
            resumePartition = pause();

            console.warn(
              `[Kafka] Paused ${topic}[${partition}] while waiting for recovery.`,
            );
          }
        };

        try {
          try {
            await processWithRetry(
              originalValue,
              heartbeat,
              pauseCurrentPartition,
            );
          } catch (error) {
            if (!(error instanceof InvalidUrlEventError)) {
              throw error;
            }

            const dlqMessage: DlqMessage = {
              originalTopic: topic,
              originalPartition: partition,
              originalOffset: message.offset,
              originalKey: message.key?.toString() ?? null,
              originalValue,
              error: error.message,
              failedAt: new Date().toISOString(),
            };

            await publishToDlqWithRetry(
              dlqMessage,
              heartbeat,
              pauseCurrentPartition,
            );
          }

          await consumer.commitOffsets([
            {
              topic,
              partition,
              offset: (BigInt(message.offset) + 1n).toString(),
            },
          ]);

          console.log(
            `[Kafka] Committed ${topic}[${partition}] offset ${message.offset}.`,
          );
        } finally {
          if (resumePartition) {
            resumePartition();

            console.log(`[Kafka] Resumed ${topic}[${partition}].`);
          }
        }
      },
    });
    running = true;

    console.log("[Kafka] Redirect consumer is running.");
  } finally {
    starting = false;
  }
}

export async function disconnectKafkaConsumer(): Promise<void> {
  if (!connected) return;

  if (running) {
    await consumer.stop();
    running = false;
  }

  await consumer.disconnect();
  connected = false;

  console.log("[Kafka] Redirect consumer disconnected.");
}

export async function connectKafkaAdmin(): Promise<void> {
  if (adminConnected) return;

  await admin.connect();
  adminConnected = true;
}

export async function checkKafkaHealth(): Promise<boolean> {
  if (!adminConnected) return false;

  try {
    await admin.describeCluster();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectKafkaAdmin(): Promise<void> {
  if (!adminConnected) return;

  await admin.disconnect();
  adminConnected = false;
}

export function isKafkaConsumerReady(): boolean {
  return connected && running;
}
