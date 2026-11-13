import { app } from "./app";
import { env } from "./config/env";

import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/connection";

import {
  connectKafkaConsumer,
  startKafkaConsumer,
  disconnectKafkaConsumer,
} from "./infrastructure/kafka/consumers/consumer";

import {
  connectDlqProducer,
  disconnectDlqProducer,
} from "./infrastructure/kafka/producers/dlq.producer";

async function bootstrap(): Promise<void> {
  let server: ReturnType<typeof app.listen> | undefined;
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;

    shuttingDown = true;

    console.log(`${signal} received. Shutting down ${env.SERVICE_NAME}...`);

    const forceExitTimer = setTimeout(() => {
      console.error("Shutdown timeout. Closing remaining connections.");

      server?.closeAllConnections();
      process.exit(1);
    }, 10000);

    forceExitTimer.unref();

    try {
      // 1. Stop accepting new HTTP requests and drain active connections.
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server!.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        console.log("HTTP server closed.");
      }

      // 2. Stop Kafka processing and disconnect the consumer.
      await disconnectKafkaConsumer();
      console.log("Kafka consumer disconnected.");

      // 3. Disconnect Redis after Kafka has stopped using it.
      await disconnectRedis();
      console.log("Redis connection closed.");
    } catch (error) {
      console.error("Shutdown failed:", error);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
    }
  }

  // 1. Connect Redis.
  try {
    await connectRedis();
    console.log("Redis connection established.");
  } catch (error) {
    console.error(
      "[Redis] Initial connection failed. Continuing without cache:",
      error instanceof Error ? error.message : error,
    );
  }
  // 2. Connect DLQ producer.
  await connectDlqProducer();

  // 3. Connect Kafka and subscribe to URL events.
  await connectKafkaConsumer();
  console.log("Kafka connection established.");

  // 4. Start the HTTP server.
  server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`,
    );
  });

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  // 5. Start Kafka consumption in the background.
  void startKafkaConsumer().catch(async (error: unknown) => {
    console.error("Kafka consumer stopped unexpectedly:", error);
    await shutdown("KAFKA_CONSUMER_FAILURE");
    process.exitCode = 1;
  });
}

bootstrap().catch(async (error: unknown) => {
  console.error("Redirect Service startup failed:", error);

  try {
    await disconnectKafkaConsumer();
    await disconnectDlqProducer();
  } catch (closeError) {
    console.error("Kafka startup cleanup failed:", closeError);
  }

  try {
    await disconnectRedis();
  } catch (closeError) {
    console.error("Redis startup cleanup failed:", closeError);
  }

  process.exitCode = 1;
});
