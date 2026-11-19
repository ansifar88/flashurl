
import express from "express";
import { AppError, ErrorCode } from "@flashurl/errors";

import { healthRouter } from "./health/health.routes";
import { analyticsRouter } from "./modules/analytics/routes/analytics.routes";
import { adminRouter } from "./modules/analytics/routes/admin.routes";

import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";

const app = express();

app.disable("x-powered-by");

// Request ID must run before body parsing and routes.
app.use(requestIdMiddleware);

// Parse incoming JSON.
app.use(express.json({ limit: "1mb" }));

// Health checks.
app.use(healthRouter);

// Analytics APIs.
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/admin/analytics", adminRouter);

// Handle unknown routes.
app.use((_req, _res, next) => {
  next(new AppError(ErrorCode.API_ROUTE_NOT_FOUND));
});

// Centralized error handler must be last.
app.use(errorHandler);

export { app };
