
import { app } from "./app";
import { env } from "./config/env";
import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/connection";

const SHUTDOWN_TIMEOUT = 10_000;

async function bootstrap(): Promise<void> {
  await connectRedis();

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `[${env.SERVICE_NAME}] listening on http://${env.HOST}:${env.PORT}`,
    );
  });

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      console.warn(
        "[API Gateway] Shutdown already in progress. Forcing connections closed.",
      );

      server.closeAllConnections();
      return;
    }

    isShuttingDown = true;

    console.log(`[API Gateway] Received ${signal}.`);
    console.log("[API Gateway] Starting graceful shutdown.");

    const forceCloseTimer = setTimeout(() => {
      console.warn(
        "[API Gateway] Shutdown deadline reached. Closing remaining connections.",
      );

      server.closeAllConnections();
    }, SHUTDOWN_TIMEOUT);

    forceCloseTimer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      clearTimeout(forceCloseTimer);

      console.log("[API Gateway] HTTP server closed.");

      await disconnectRedis();

      console.log("[API Gateway] Redis disconnected.");
      console.log("[API Gateway] Shutdown complete.");
    } catch (error) {
      clearTimeout(forceCloseTimer);

      console.error("[API Gateway] Shutdown failed:", error);

      process.exitCode = 1;
    }
  }

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

bootstrap().catch(async (error) => {
  console.error("[API Gateway] Startup failed:", error);

  try {
    await disconnectRedis();
  } catch (redisError) {
    console.error(
      "[API Gateway] Redis cleanup failed:",
      redisError,
    );
  }

  process.exitCode = 1;
});
