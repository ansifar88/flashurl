
import { Router } from "express";
import { env } from "../config/env";

import { redis } from "../infrastructure/redis/connection";

import {
  checkKafkaHealth,
  isKafkaConsumerReady,
} from "../infrastructure/kafka/consumers/consumer";

import {
  isDlqProducerConnected,
} from "../infrastructure/kafka/producers/dlq.producer";

const router = Router();

// Liveness: confirms the process is alive.
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// Readiness: verifies required dependencies.
router.get("/ready", async (_req, res) => {
  const checks = {
    redis: false,
    kafka: false,
    kafkaConsumer: false,
    dlqProducer: false,
  };

  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  checks.kafka = await checkKafkaHealth();
  checks.kafkaConsumer = isKafkaConsumerReady();
  checks.dlqProducer = isDlqProducerConnected();

  const ready = Object.values(checks).every(Boolean);

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    service: env.SERVICE_NAME,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
