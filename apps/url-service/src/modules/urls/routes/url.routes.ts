
import { Router } from "express";
import { handleCreateUrl, handleGetUrl, handleUpdateUrl, handleDeleteUrl } from "../controllers/url.controller";

const router = Router();

router.post("/", handleCreateUrl);
router.get("/:shortCode", handleGetUrl);
router.patch("/:shortCode", handleUpdateUrl)
router.delete("/:shortCode", handleDeleteUrl)

export { router as urlRouter };
