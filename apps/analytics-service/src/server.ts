import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `${env.SERVICE_NAME} listening on http://${env.HOST}:${env.PORT}`
  );
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`${signal} received. Shutting down ${env.SERVICE_NAME}...`);

  server.close((error) => {
    if (error) {
      console.error("Graceful shutdown failed:", error);
      process.exitCode = 1;
    }

    process.exit();
  });

  // Force shutdown if connections do not close in time.
  setTimeout(() => {
    console.error("Shutdown timeout. Closing remaining connections.");

    server.closeAllConnections();
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
