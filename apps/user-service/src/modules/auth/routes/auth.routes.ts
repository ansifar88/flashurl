
import { Router } from "express";

import { loginController } from "../controllers/auth.controller";
import { refreshController } from "../controllers/refresh.controller";
import { logoutController } from "../controllers/logout.controller";

import { loginSchema } from "../validators/login.schema";
import { validateRequest } from "../../../middleware/validate-request";

const router = Router();

router.post(
  "/login",
  validateRequest(loginSchema),
  loginController
);

router.post("/logout", logoutController);

router.post("/refresh", refreshController);

export { router as authRouter };
