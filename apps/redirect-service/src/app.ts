
import express from "express";
import { healthRouter } from "./health/health.routes";
import { redirectRouter } from "./modules/redirect/routes/redirect.routes";
import { errorHandler } from "./middleware/error-handler";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(redirectRouter);

// Error handler must be registered last.
app.use(errorHandler);

export { app };
