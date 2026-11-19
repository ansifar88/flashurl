
import { Router } from "express";
import { sequelize } from "../infrastructure/database/connection";
import { env } from "../config/env";

const router = Router();

// Liveness: confirms the User Service process is running.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: env.SERVICE_NAME,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Readiness: verifies MySQL connectivity.
router.get("/ready", async (_req, res) => {
  let mysqlStatus = "unavailable";

  try {
    await sequelize.authenticate();
    mysqlStatus = "connected";
  } catch (error) {
    console.error("[User Service] MySQL readiness check failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const isReady = mysqlStatus === "connected";

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    service: env.SERVICE_NAME,
    status: isReady ? "ready" : "not_ready",
    dependencies: {
      mysql: mysqlStatus,
    },
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
