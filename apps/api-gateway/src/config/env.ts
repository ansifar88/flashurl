import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  SERVICE_NAME: z.string().default("api-gateway"),

  HOST: z.string().default("0.0.0.0"),

  PORT: z.coerce.number().int().positive().default(4000),

  URL_SERVICE_URL: z.string().url().default("http://localhost:4001"),

  REDIRECT_SERVICE_URL: z.string().url().default("http://localhost:4002"),

  USER_SERVICE_URL: z.string().url().default("http://localhost:4003"),

  ANALYTICS_SERVICE_URL: z.string().url().default("http://localhost:4004"),

  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  // JWT verification
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  ACCESS_TOKEN_COOKIE_NAME: z.string().default("flashurl_access"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "[API Gateway] Invalid environment configuration:",
    parsedEnv.error.flatten().fieldErrors,
  );

  process.exit(1);
}

export const env = parsedEnv.data;
