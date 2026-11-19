import express from "express";
import cookieParser from "cookie-parser";

import { healthRouter } from "./health/health.routes";
import { userRouter } from "./modules/users/routes/user.routes";
import { authRouter } from "./modules/auth/routes/auth.routes";
import { internalRouter } from "./modules/users/routes/internal.routes";

import { requestIdMiddleware } from "./middleware/request-id";
import { notFoundMiddleware } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app = express();

app.use(requestIdMiddleware);

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(healthRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/users/auth", authRouter);
app.use("/internal", internalRouter);

app.use(notFoundMiddleware);
app.use(errorHandler);

export { app };
