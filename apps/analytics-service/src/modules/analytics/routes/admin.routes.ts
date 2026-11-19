import { Router } from "express";
import { authenticate } from "../../../middleware/auth.middleware";
import { requireAdmin } from "../../../middleware/require-admin";

const adminRouter = Router();

// Every route below requires a valid access token and admin role.
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

export { adminRouter };