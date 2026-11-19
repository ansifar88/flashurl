
import { Router, type Request, type Response } from "express";
import {
  createProxyMiddleware,
  fixRequestBody,
} from "http-proxy-middleware";

import { env } from "../config/env";
import { handleProxyError } from "../utils/proxy-error-handler";

const router = Router();

const createServiceProxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 15_000,
    timeout: 15_000,
    on: {
      proxyReq: fixRequestBody,
      error: (error, req, res, target) => {
        handleProxyError(
          error,
          req as Request,
          res as Response,
          String(target),
        );
      },
    },
  });

const urlProxy = createServiceProxy(env.URL_SERVICE_URL);

const userProxy = createServiceProxy(env.USER_SERVICE_URL);

const analyticsProxy = createServiceProxy(
  env.ANALYTICS_SERVICE_URL,
);

router.use((req, res, next) => {
  const path = req.path;

  const isUrlRoute =
    path === "/api/v1/urls" ||
    path.startsWith("/api/v1/urls/");

  const isUserRoute =
    path === "/api/v1/users" ||
    path.startsWith("/api/v1/users/");

  const isAnalyticsRoute =
    path === "/api/v1/analytics" ||
    path.startsWith("/api/v1/analytics/") ||
    path === "/api/v1/admin/analytics" ||
    path.startsWith("/api/v1/admin/analytics/");

  if (isUrlRoute) {
    return urlProxy(req, res, next);
  }

  if (isUserRoute) {
    return userProxy(req, res, next);
  }

  if (isAnalyticsRoute) {
    return analyticsProxy(req, res, next);
  }

  next();
});

export { router as proxyRouter };
