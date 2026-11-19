import { Router } from "express";
import { sequelize } from "../infrastructure/database/connection";
import { env } from "../config/env";
import { checkKafkaHealth } from "../infrastructure/kafka/producers/producer";

const router = Router();

// Liveness: confirms the URL Service process is running.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: env.SERVICE_NAME,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Readiness: checks required dependencies.
router.get("/ready", async (_req, res) => {
  const dependencies = {
    mysql: "unavailable",
    kafka: "unavailable",
  };

  try {
    await sequelize.authenticate();
    dependencies.mysql = "connected";
  } catch (error) {
    console.error("[URL Service] MySQL readiness check failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  dependencies.kafka = (await checkKafkaHealth()) ? "connected" : "unavailable";

  const isReady =
    dependencies.mysql === "connected" && dependencies.kafka === "connected";

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    service: env.SERVICE_NAME,
    status: isReady ? "ready" : "not_ready",
    dependencies,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
