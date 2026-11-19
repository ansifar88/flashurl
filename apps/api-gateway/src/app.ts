import express from "express";
import helmet from "helmet";
import cors from "cors";

import { createProxyMiddleware } from "http-proxy-middleware";
import { AppError, ErrorCode } from "@flashurl/errors";

import { env } from "./config/env";
import { proxyRouter } from "./routes/proxy.routes";
import { requestIdMiddleware } from "./middleware/request-id";
import { requestLogger } from "./middleware/request-logger";
import { rateLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";
import { handleProxyError } from "./utils/proxy-error-handler";
import { authenticate } from "./middleware/authenticate";
import { stripIdentityHeaders } from "./middleware/strip-identity-headers";
import { healthRouter } from "./routes/health.routes";

const app = express();

app.disable("x-powered-by");
app.use(helmet());

app.use(requestIdMiddleware);
app.use(stripIdentityHeaders);
app.use(requestLogger);

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients such as Postman.
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
    maxAge: 600,
  }),
);

// Health check
app.use(healthRouter);

// Global rate limit
app.use(
  rateLimiter({
    scope: "global",
    windowMs: 60 * 1000,
    maxRequests: 300,
  }),
);

// Login rate limit
app.use(
  "/api/v1/users/auth/login",
  rateLimiter({
    scope: "login",
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: "Too many login attempts. Try again later.",
  }),
);

// Registration rate limit
app.use(
  "/api/v1/users/register",
  rateLimiter({
    scope: "registration",
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: "Too many registration attempts. Try again later.",
  }),
);

// Request body size limit
app.use(express.json({ limit: "1mb" }));

// Protected URL operations
app.patch("/api/v1/urls/:shortCode", authenticate);

app.delete("/api/v1/urls/:shortCode", authenticate);

// Protected user profile
app.get("/api/v1/users/me", authenticate);

// URL and User Service proxies
app.use(proxyRouter);

// Redirect Service proxy
app.use(
  createProxyMiddleware({
    target: env.REDIRECT_SERVICE_URL,
    changeOrigin: true,
    proxyTimeout: 15_000,
    timeout: 15_000,
    pathFilter: (path) => /^\/[0-9A-Za-z]{10}\/?$/.test(path),
    on: {
      error: (error, req, res, target) => {
        handleProxyError(
          error,
          req as express.Request,
          res as express.Response,
          String(target),
        );
      },
    },
  }),
);

// Unknown routes
app.use((_req, _res, next) => {
  next(new AppError(ErrorCode.API_ROUTE_NOT_FOUND));
});

// Centralized error handler — must be last.
app.use(errorHandler);

export { app };
