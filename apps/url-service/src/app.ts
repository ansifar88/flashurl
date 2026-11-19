import express from "express";
import { healthRouter } from "./health/health.routes";

import { urlRouter } from "./modules/urls/routes/url.routes";
import { requestIdMiddleware } from "./middleware/request-id";
import { notFoundMiddleware } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";
import cookieParser from "cookie-parser";
import { internalRouter } from "./modules/urls/routes/internal.routes";

const app = express();
app.use(requestIdMiddleware);

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(healthRouter);

app.use("/api/v1/urls", urlRouter);

app.use("/internal", internalRouter);

app.use(notFoundMiddleware);
app.use(errorHandler);

export { app };
