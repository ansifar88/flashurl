
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - startTime) / 1_000_000;

    const log = {
      timestamp: new Date().toISOString(),
      level:
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info",
      service: "api-gateway",
      requestId: res.locals.requestId ?? "unknown",
      method: req.method,
      route: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      errorCode: res.locals.errorCode ?? null,
      durationMs: Number(durationMs.toFixed(2)),
    };

    console.log(JSON.stringify(log));
  });

  next();
};
