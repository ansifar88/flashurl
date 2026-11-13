
import { app } from "./app";
import { env } from "./config/env";
import { sequelize } from "./infrastructure/database/connection";
import { Url } from "./modules/urls/models/url.model";
import "./modules/urls/models/outbox-event.model";
import { startOutboxWorker } from "./infrastructure/kafka/outbox/outbox.worker";

let stopOutboxWorker: (() => Promise<void>) | undefined;

async function bootstrap(): Promise<void> {
  Url.initialize(sequelize);

  await sequelize.authenticate();

  console.log("MySQL connection established.");

  stopOutboxWorker = startOutboxWorker();

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`,
    );
  });

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down URL Service...`);

    const forceExitTimer = setTimeout(() => {
      console.error("Shutdown timeout. Closing remaining connections.");
      server.closeAllConnections();
      process.exit(1);
    }, 10000);

    forceExitTimer.unref();

    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed:", error);
        process.exitCode = 1;
      }

      try {
        await stopOutboxWorker?.();
        stopOutboxWorker = undefined;

        console.log("Outbox worker stopped.");

        await sequelize.close();

        console.log("Database connection closed.");
      } catch (closeError) {
        console.error("Application shutdown failed:", closeError);
        process.exitCode = 1;
      } finally {
        clearTimeout(forceExitTimer);
      }
    });
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch(async (error: unknown) => {
  console.error("URL Service startup failed:", error);

  try {
    await stopOutboxWorker?.();
    stopOutboxWorker = undefined;

    await sequelize.close();

    console.log("Application resources closed.");
  } catch (closeError) {
    console.error("Application cleanup failed:", closeError);
  }

  process.exitCode = 1;
});
