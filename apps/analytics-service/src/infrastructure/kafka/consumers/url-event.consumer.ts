
import { Kafka, logLevel, type Consumer } from "kafkajs";
import { UrlEventType } from "@flashurl/contracts";

import { env } from "../../../config/env";

import {
  handleUrlEvent,
  InvalidUrlEventError,
} from "../../../modules/urls/services/url-event.handler";

import {
  publishAnalyticsToDlq,
  type AnalyticsDlqMessage,
} from "../producers/dlq.producer";

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
  clientId: `${env.KAFKA_CLIENT_ID}-url-lifecycle`,
  brokers,
  logLevel: logLevel.ERROR,
  requestTimeout: 5_000,
  enforceRequestTimeout: true,
});

const consumer: Consumer = kafka.consumer({
  groupId: env.KAFKA_URL_CONSUMER_GROUP_ID,
});

let connected = false;
let running = false;
let starting = false;

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

      attempt++;
      pausePartition();

      const delay = getRetryDelay(attempt);

      console.error(
        `[Analytics] URL lifecycle processing failed. Retry ${attempt} in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );

      await waitWithHeartbeat(delay, heartbeat);
    }
  }
}

async function publishToDlqWithRetry(
  message: AnalyticsDlqMessage,
  heartbeat: () => Promise<void>,
  pausePartition: PausePartition,
): Promise<void> {
  let attempt = 0;

  while (true) {
    try {
      await publishAnalyticsToDlq(message);
      return;
    } catch (error) {
      attempt++;
      pausePartition();

      const delay = getRetryDelay(attempt);

      console.error(
        `[Analytics] URL lifecycle DLQ publishing failed. Retry ${attempt} in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );

      await waitWithHeartbeat(delay, heartbeat);
    }
  }
}

export async function connectUrlEventConsumer(): Promise<void> {
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

    console.log(
      "[Kafka] Analytics URL lifecycle consumer connected and subscribed.",
    );
  } catch (error) {
    await consumer.disconnect();
    throw error;
  }
}

export async function startUrlEventConsumer(): Promise<void> {
  if (!connected) {
    throw new Error(
      "Analytics URL lifecycle consumer must be connected before starting.",
    );
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
              `[Analytics] Paused ${topic}[${partition}] while waiting for recovery.`,
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

            const dlqMessage: AnalyticsDlqMessage = {
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
            `[Analytics] Committed ${topic}[${partition}] offset ${message.offset}.`,
          );
        } finally {
          if (resumePartition) {
            resumePartition();
          }
        }
      },
    });

    running = true;

    console.log("[Kafka] Analytics URL lifecycle consumer is running.");
  } finally {
    starting = false;
  }
}

export async function disconnectUrlEventConsumer(): Promise<void> {
  if (!connected) return;

  if (running) {
    await consumer.stop();
    running = false;
  }

  await consumer.disconnect();
  connected = false;

  console.log("[Kafka] Analytics URL lifecycle consumer disconnected.");
}

export function isUrlEventConsumerReady(): boolean {
  return connected && running;
}
