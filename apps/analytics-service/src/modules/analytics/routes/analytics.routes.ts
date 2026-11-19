import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";

import {
  getOverview,
  getDailyClicks,
  getReferrerStats,
  getDashboardOverview
} from "../controllers/analytics.controller";

const analyticsRouter = Router();

// All analytics endpoints require a valid access token.
analyticsRouter.use(authenticate);

analyticsRouter.get("/overview", getDashboardOverview);

analyticsRouter.get("/:shortCode", getOverview);
analyticsRouter.get("/:shortCode/daily", getDailyClicks);
analyticsRouter.get("/:shortCode/referrers", getReferrerStats);

export { analyticsRouter };
