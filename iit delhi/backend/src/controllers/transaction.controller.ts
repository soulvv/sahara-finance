import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { transactionService } from "../services/transaction.service";
import { sendError, sendSuccess } from "../utils/response";

export async function getRecentTransactionsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view transactions.");
      return;
    }

    const { limit } = req.query;
    const transactions = await transactionService.getRecentTransactions(userId, limit);
    sendSuccess(res, { transactions });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
