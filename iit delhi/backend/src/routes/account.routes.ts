import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getBalanceHandler } from "../controllers/account.controller";

const router = Router();

// Account endpoints require active JWT authentication
router.use(authMiddleware);

router.get("/balance", getBalanceHandler);

export default router;
