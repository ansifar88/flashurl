import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  SERVICE_NAME: z.string().default("user-service"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4003),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3307),
  DB_NAME: z.string().default("flashurl_users"),
  DB_USER: z.string().default("flashurl_user"),
  DB_PASSWORD: z.string().min(1),

  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_ISSUER: z.string().default("flashurl-user-service"),

  JWT_AUDIENCE: z.string().default("flashurl-api"),

  JWT_ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),

  ACCESS_TOKEN_COOKIE_NAME: z.string().default("flashurl_access"),

  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  JWT_REFRESH_SECRET: z.string().min(32),

  JWT_REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),

  REFRESH_TOKEN_COOKIE_NAME: z.string().default("flashurl_refresh"),

  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid User Service environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

if (result.data.DB_POOL_MIN > result.data.DB_POOL_MAX) {
  throw new Error("DB_POOL_MIN cannot exceed DB_POOL_MAX");
}

export const env = result.data;
