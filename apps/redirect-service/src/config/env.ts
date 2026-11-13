import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  SERVICE_NAME: z.string().default("redirect-service"),

  HOST: z.string().default("0.0.0.0"),

  PORT: z.coerce.number().int().min(1).max(65535).default(4002),

  REDIS_HOST: z.string().default("localhost"),

  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),

  REDIS_PASSWORD: z.string().optional(),

  REDIS_DB: z.coerce.number().int().min(0).default(0),

  URL_SERVICE_BASE_URL: z.string().url().default("http://localhost:4001"),

  KAFKA_BROKERS: z.string().default("localhost:29092"),

  KAFKA_CLIENT_ID: z.string().default("flashurl-redirect-service"),

  KAFKA_CONSUMER_GROUP_ID: z.string().default("flashurl-redirect-service"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment configuration:",
    parsedEnv.error.flatten().fieldErrors,
  );

  process.exit(1);
}

export const env = parsedEnv.data;
