import { Router } from "express";
import { getMeHandler, updateMeHandler } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Protected user routes
router.get("/me", authMiddleware, getMeHandler);
router.patch("/me", authMiddleware, updateMeHandler);

export default router;
