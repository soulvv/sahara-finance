import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getRecentTransactionsHandler } from "../controllers/transaction.controller";

const router = Router();

// Transaction endpoints require active JWT authentication
router.use(authMiddleware);

router.get("/recent", getRecentTransactionsHandler);

export default router;
