import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getOnboardingHandler,
  updateProgressHandler,
  submitConsentHandler,
} from "../controllers/onboarding.controller";

const router = Router();

// All onboarding endpoints require active JWT authentication
router.use(authMiddleware);

router.get("/", getOnboardingHandler);
router.patch("/progress", updateProgressHandler);
router.post("/consent", submitConsentHandler);

export default router;
