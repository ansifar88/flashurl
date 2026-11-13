import express from "express";
import { healthRouter } from "./health/health.routes";

import { urlRouter } from "./modules/urls/routes/url.routes";
import { requestIdMiddleware } from "./middleware/request-id";
import { notFoundMiddleware } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app = express();
app.use(requestIdMiddleware);

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);

app.use("/api/v1/urls", urlRouter);

app.use(notFoundMiddleware);
app.use(errorHandler);

export { app };
