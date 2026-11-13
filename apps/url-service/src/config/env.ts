import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  SERVICE_NAME: z.string().default("url-service"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3307),
  DB_NAME: z.string().default("flashurl_urls"),
  DB_USER: z.string().default("flashurl_url"),
  DB_PASSWORD: z.string().min(1),

  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),

  SHORT_URL_BASE_URL: z.string().url().default("http://localhost:4002"),

  KAFKA_BROKERS: z.string().default("localhost:29092"),
  KAFKA_CLIENT_ID: z.string().default("flashurl-url-service"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid URL Service environment:",
    result.error.flatten().fieldErrors,
  );

  process.exit(1);
}

if (result.data.DB_POOL_MIN > result.data.DB_POOL_MAX) {
  throw new Error("DB_POOL_MIN cannot exceed DB_POOL_MAX");
}

export const env = result.data;
