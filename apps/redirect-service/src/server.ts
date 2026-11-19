import { app } from "./app";
import { env } from "./config/env";

import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/connection";

import {
  connectKafkaAdmin,
  connectKafkaConsumer,
  startKafkaConsumer,
  disconnectKafkaAdmin,
  disconnectKafkaConsumer,
} from "./infrastructure/kafka/consumers/consumer";

import {
  connectDlqProducer,
  disconnectDlqProducer,
} from "./infrastructure/kafka/producers/dlq.producer";

import {
  connectClickEventProducer,
  disconnectClickEventProducer,
} from "./infrastructure/kafka/producers/click-event.producer";

const SHUTDOWN_TIMEOUT_MS = 10_000;

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
    }, SHUTDOWN_TIMEOUT_MS);

    forceExitTimer.unref();

    let shutdownFailed = false;

    async function closeResource(
      name: string,
      close: () => Promise<void>,
    ): Promise<void> {
      try {
        await close();
        console.log(`${name} closed.`);
      } catch (error) {
        shutdownFailed = true;
        console.error(`Failed to close ${name}:`, error);
      }
    }

    try {
      // 1. Stop accepting HTTP requests and drain active connections.
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server!.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        console.log("HTTP server closed.");
      }

      // 2. Stop Kafka consumption.
      await closeResource("Kafka consumer", disconnectKafkaConsumer);

      // 3. Disconnect Kafka Admin.
      await closeResource("Kafka Admin", disconnectKafkaAdmin);

      // 4. Disconnect DLQ producer.
      await closeResource("DLQ producer", disconnectDlqProducer);

      // 5. Disconnect Click Event producer.
      await closeResource("Click event producer", disconnectClickEventProducer);

      // 6. Disconnect Redis after Kafka has stopped using it.
      await closeResource("Redis", disconnectRedis);

      if (shutdownFailed) {
        process.exitCode = 1;
      } else {
        console.log(`${env.SERVICE_NAME} shutdown complete.`);
      }
    } catch (error) {
      shutdownFailed = true;
      console.error("HTTP shutdown failed:", error);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
    }
  }

  try {
    // 1. Connect Redis. Redirect Service can start without its cache.
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
    console.log("DLQ producer connected.");

    // 3. Connect Click Event producer.
    await connectClickEventProducer();
    console.log("Click event producer connected.");

    // 4. Connect Kafka Admin for broker health checks.
    await connectKafkaAdmin();
    console.log("Kafka Admin connected.");

    // 5. Connect and subscribe Kafka consumer.
    await connectKafkaConsumer();
    console.log("Kafka consumer connected and subscribed.");

    // 6. Register shutdown handlers.
    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));

    // 7. Start HTTP server.
    server = app.listen(env.PORT, env.HOST, () => {
      console.log(
        `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`,
      );
    });

    // 8. Start Kafka consumption.
    // startKafkaConsumer resolves when KafkaJS has started the consumer.
    void startKafkaConsumer().catch(async (error: unknown) => {
      console.error("Kafka consumer startup failed:", error);
      await shutdown("KAFKA_CONSUMER_FAILURE");
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Redirect Service startup failed:", error);

    await shutdown("STARTUP_FAILURE");
    process.exitCode = 1;
  }
}

void bootstrap();
