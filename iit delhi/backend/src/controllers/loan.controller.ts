import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { loanService } from "../services/loan.service";
import { sendError, sendSuccess } from "../utils/response";

export async function getActiveLoanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view active loans.");
      return;
    }

    const loan = await loanService.getActiveLoan(userId);
    sendSuccess(res, { loan });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function getLoanDetailsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view loan details.");
      return;
    }

    const { loanId } = req.params;
    const loan = await loanService.getLoan(userId, loanId);
    sendSuccess(res, { loan });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function getLoanRepaymentsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view repayments.");
      return;
    }

    const { loanId } = req.params;
    const repayments = await loanService.getLoanRepayments(userId, loanId);
    sendSuccess(res, { repayments });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function repayLoanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to repay EMI.");
      return;
    }

    const { loanId } = req.params;
    const { idempotencyKey } = req.body;
    const result = await loanService.repayNextEmi(userId, loanId, idempotencyKey);
    sendSuccess(res, result);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message, {
        availableBalance: error.availableBalance,
      });
      return;
    }
    next(error);
  }
}
