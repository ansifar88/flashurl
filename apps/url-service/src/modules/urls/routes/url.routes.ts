import { Router } from "express";
import {
  handleCreateUrl,
  handleGetUrl,
  handleUpdateUrl,
  handleDeleteUrl,
} from "../controllers/url.controller";
import { optionalAuthenticate } from "../../../middleware/optional-authenticate";
import { authenticate } from "../../../middleware/authenticate";

const router = Router();

router.post("/", optionalAuthenticate, handleCreateUrl);
router.get("/:shortCode", handleGetUrl);
router.patch("/:shortCode", authenticate, handleUpdateUrl);
router.delete("/:shortCode", authenticate, handleDeleteUrl);

export { router as urlRouter };
