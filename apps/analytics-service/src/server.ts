import { app } from "./app";
import { env } from "./config/env";

import { sequelize } from "./infrastructure/database/connection";

import {
  connectClickEventConsumer,
  startClickEventConsumer,
  disconnectClickEventConsumer,
} from "./infrastructure/kafka/consumers/click-event.consumer";

import {
  connectAnalyticsDlqProducer,
  disconnectAnalyticsDlqProducer,
} from "./infrastructure/kafka/producers/dlq.producer";

import { ClickEvent } from "./modules/clicks/models/click-event.model";
import { UrlDimension } from "./modules/urls/models/url-dimension.model";
import { UrlEventState } from "./modules/urls/models/url-event-state.model";

import {
  connectUrlEventConsumer,
  startUrlEventConsumer,
  disconnectUrlEventConsumer,
} from "./infrastructure/kafka/consumers/url-event.consumer";

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
      await closeResource("Click event consumer", disconnectClickEventConsumer);

      await closeResource("URL lifecycle consumer", disconnectUrlEventConsumer);
      // 3. Disconnect the DLQ producer.
      await closeResource(
        "Analytics DLQ producer",
        disconnectAnalyticsDlqProducer,
      );

      // 4. Close MySQL after event processing has stopped.
      await closeResource("MySQL", () => sequelize.close());

      if (shutdownFailed) {
        process.exitCode = 1;
      } else {
        console.log(`${env.SERVICE_NAME} shutdown complete.`);
      }
    } catch (error) {
      shutdownFailed = true;
      console.error("Shutdown failed:", error);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
    }
  }

  try {
    // 1. Register Sequelize models.
    ClickEvent.initialize(sequelize);
    UrlDimension.initialize(sequelize);
    UrlEventState.initialize(sequelize);

    // 2. Authenticate MySQL.
    await sequelize.authenticate();
    console.log("[MySQL] Database connection established.");

    // 3. Connect the DLQ producer.
    await connectAnalyticsDlqProducer();
    console.log("[Kafka] Analytics DLQ producer connected.");

    // 4. Connect and subscribe to url.clicked.
    await connectClickEventConsumer();
    console.log("[Kafka] Analytics consumer connected.");

    // 5. Connect and subscribe to url.created, url.updated, url.deleted.
    await connectUrlEventConsumer();
    console.log("[Kafka] URL lifecycle consumer connected.");

    // 6. Register shutdown handlers.
    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));

    // 7. Start HTTP server.
    server = app.listen(env.PORT, env.HOST, () => {
      console.log(
        `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`,
      );
    });

    // 8. Start consuming events.
    void startClickEventConsumer().catch(async (error: unknown) => {
      console.error("Analytics Kafka consumer failed:", error);
      await shutdown("KAFKA_CONSUMER_FAILURE");
      process.exitCode = 1;
    });
    
    // 9. Start consuming URL lifecycle events.
    void startUrlEventConsumer().catch(async (error: unknown) => {
      console.error("Analytics URL lifecycle consumer failed:", error);
      await shutdown("URL_CONSUMER_FAILURE");
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Analytics Service startup failed:", error);

    await shutdown("STARTUP_FAILURE");
    process.exitCode = 1;
  }
}

void bootstrap();
