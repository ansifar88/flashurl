
import { Router } from "express";

import { authenticate } from "../../../middleware/authenticate";
import { handleGetUserRole } from "../controllers/user-role.controller";

const internalRouter = Router();

internalRouter.get(
  "/users/me/role",
  authenticate,
  handleGetUserRole,
);

export { internalRouter };
