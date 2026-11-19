
import Redis from "ioredis";
import { env } from "../../config/env";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,

  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,

  keyPrefix: "flashurl:ratelimit:gateway:",

  retryStrategy(times) {
    return Math.min(times * 1000, 5000);
  },
});

redis.on("connect", () => {
  console.log("[Gateway Redis] Connected");
});

redis.on("error", (error) => {
  console.error("[Gateway Redis] Connection error:", error.message);
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status !== "end") {
    await redis.quit();
  }
}
