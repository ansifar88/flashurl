import { Router } from "express";
import { redis } from "../infrastructure/redis/connection";
import { env } from "../config/env";

const router = Router();

// Liveness: confirms the process is running.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: env.SERVICE_NAME,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Readiness: confirms required infrastructure is available.
router.get("/ready", async (_req, res) => {
  try {
    await redis.ping();

    res.status(200).json({
      success: true,
      service: env.SERVICE_NAME,
      status: "ready",
      dependencies: {
        redis: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      service: env.SERVICE_NAME,
      status: "not_ready",
      dependencies: {
        redis: "unavailable",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as healthRouter };
