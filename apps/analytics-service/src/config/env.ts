import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  SERVICE_NAME: z.string().default("analytics-service"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4004),
  URL_SERVICE_INTERNAL_URL: z.string().url().default("http://localhost:4001"),
  USER_SERVICE_INTERNAL_URL: z.string().url().default("http://localhost:4003"),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  ACCESS_TOKEN_COOKIE_NAME: z.string().default("flashurl_access"),

  ANALYTICS_DB_HOST: z.string().default("127.0.0.1"),
  ANALYTICS_DB_PORT: z.coerce.number().int().min(1).max(65535).default(3307),
  ANALYTICS_DB_NAME: z.string().default("flashurl_analytics"),
  ANALYTICS_DB_USER: z.string().default("flashurl_analytics"),
  ANALYTICS_DB_PASSWORD: z.string().min(1),

  ANALYTICS_DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  ANALYTICS_DB_POOL_MAX: z.coerce.number().int().min(1).default(10),

  KAFKA_BROKERS: z.string().default("localhost:29092"),
  KAFKA_CLIENT_ID: z.string().default("flashurl-analytics-service"),
  KAFKA_CONSUMER_GROUP_ID: z.string().default("flashurl-analytics-consumer"),
  KAFKA_URL_CONSUMER_GROUP_ID: z
    .string()
    .default("flashurl-analytics-url-consumer"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid Analytics Service environment:",
    result.error.flatten().fieldErrors,
  );

  process.exit(1);
}

if (result.data.ANALYTICS_DB_POOL_MIN > result.data.ANALYTICS_DB_POOL_MAX) {
  throw new Error("ANALYTICS_DB_POOL_MIN cannot exceed ANALYTICS_DB_POOL_MAX");
}

export const env = result.data;
