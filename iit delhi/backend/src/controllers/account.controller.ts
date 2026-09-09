import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { accountService } from "../services/account.service";
import { sendError, sendSuccess } from "../utils/response";

export async function getBalanceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view account balance.");
      return;
    }

    const account = await accountService.getBalanceForUser(userId);
    sendSuccess(res, {
      account: {
        accountNumberMasked: account.accountNumberMasked,
        balance: account.balance,
        currency: account.currency,
        status: account.status,
      },
      lastUpdated: account.lastUpdated,
    });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
