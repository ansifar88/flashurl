import { Kafka, logLevel, type Consumer } from "kafkajs";
import { UrlEventType } from "@flashurl/contracts";

import { env } from "../../../config/env";

import {
  handleClickEvent,
  InvalidClickEventError,
} from "../../../modules/clicks/services/click-event.handler";

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
  clientId: env.KAFKA_CLIENT_ID,
  brokers,
  logLevel: logLevel.ERROR,
  requestTimeout: 5_000,
  enforceRequestTimeout: true,
});

const consumer: Consumer = kafka.consumer({
  groupId: env.KAFKA_CONSUMER_GROUP_ID,
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
      await handleClickEvent(message);
      return;
    } catch (error) {
      if (error instanceof InvalidClickEventError) {
        throw error;
      }

      attempt++;
      pausePartition();

      const delay = getRetryDelay(attempt);

      console.error(
        `[Analytics] Database processing failed. Retry ${attempt} in ${delay}ms:`,
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
        `[Analytics] DLQ publishing failed. Retry ${attempt} in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );

      await waitWithHeartbeat(delay, heartbeat);
    }
  }
}

export async function connectClickEventConsumer(): Promise<void> {
  if (connected) return;

  await consumer.connect();

  try {
    await consumer.subscribe({
      topics: [UrlEventType.CLICKED],
      fromBeginning: false,
    });

    connected = true;

    console.log("[Kafka] Analytics consumer connected and subscribed.");
  } catch (error) {
    await consumer.disconnect();
    throw error;
  }
}

export async function startClickEventConsumer(): Promise<void> {
  if (!connected) {
    throw new Error(
      "Analytics Kafka consumer must be connected before starting.",
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
            if (!(error instanceof InvalidClickEventError)) {
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

    console.log("[Kafka] Analytics consumer is running.");
  } finally {
    starting = false;
  }
}

export async function disconnectClickEventConsumer(): Promise<void> {
  if (!connected) return;

  if (running) {
    await consumer.stop();
    running = false;
  }

  await consumer.disconnect();
  connected = false;

  console.log("[Kafka] Analytics consumer disconnected.");
}

export function isClickEventConsumerReady(): boolean {
  return connected && running;
}
