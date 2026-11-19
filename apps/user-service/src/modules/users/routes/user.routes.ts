
import { Router } from "express";
import { registerController } from "../controllers/user.controller";
import { profileController } from "../controllers/profile.controller";

import { registerSchema } from "../validators/register.schema";
import { validateRequest } from "../../../middleware/validate-request";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  registerController
);
router.get("/me", authenticate, profileController);

export { router as userRouter };
