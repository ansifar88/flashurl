import express from "express";
import { healthRouter } from "./health/health.routes";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);

export { app };
