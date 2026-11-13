import { Router } from "express";
import { env } from "../config/env";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };
