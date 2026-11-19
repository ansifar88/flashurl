import { Router } from "express";

import { authenticate } from "../../../middleware/authenticate";
import { handleVerifyUrlOwnership } from "../controllers/ownership.controller";
import { requireAdmin } from "../../../middleware/require-admin";
import { handleGetUrlStatistics } from "../controllers/url-statistics.controller";

const internalRouter = Router();

internalRouter.get(
  "/urls/:shortCode/ownership",
  authenticate,
  handleVerifyUrlOwnership,
);

internalRouter.get(
  "/admin/urls/stats",
  authenticate,
  requireAdmin,
  handleGetUrlStatistics,
);
export { internalRouter };