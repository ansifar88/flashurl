
import { Router } from "express";
import { handleRedirect } from "../controllers/redirect.controller";

const router = Router();

router.get("/:shortCode", handleRedirect);

export { router as redirectRouter };
