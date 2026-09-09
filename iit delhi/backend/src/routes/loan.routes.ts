import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  getActiveLoanHandler,
  getLoanDetailsHandler,
  getLoanRepaymentsHandler,
  repayLoanHandler,
} from "../controllers/loan.controller";

const router = Router();

// Loan endpoints require active JWT authentication
router.use(authMiddleware);

router.get("/active", getActiveLoanHandler);
router.get("/:loanId", getLoanDetailsHandler);
router.get("/:loanId/repayments", getLoanRepaymentsHandler);
router.post("/:loanId/repay", repayLoanHandler);

export default router;
