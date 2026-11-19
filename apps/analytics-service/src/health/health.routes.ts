
import { Router } from "express";
import { env } from "../config/env";
import { sequelize } from "../infrastructure/database/connection";

const router = Router();

// Liveness: confirms the HTTP process is running.
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// Readiness: checks actual MySQL connectivity.
router.get("/ready", async (_req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      status: "ready",
      service: env.SERVICE_NAME,
      checks: {
        mysql: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: "not_ready",
      service: env.SERVICE_NAME,
      checks: {
        mysql: false,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as healthRouter };
