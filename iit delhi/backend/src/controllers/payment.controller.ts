import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { paymentService } from "../services/payment.service";
import { sendError, sendSuccess } from "../utils/response";

export async function initiatePaymentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to initiate payments.");
      return;
    }

    const { merchantId, recipientUpi, amount } = req.body;
    const payment = await paymentService.initiatePayment(userId, {
      merchantId,
      recipientUpi,
      amount,
    });

    sendSuccess(res, { payment }, 201);
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

export async function getPaymentDetailsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view payments.");
      return;
    }

    const { id } = req.params;
    const payment = await paymentService.getPaymentDetails(userId, id);
    sendSuccess(res, { payment });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function executePaymentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to execute payments.");
      return;
    }

    const { paymentId, idempotencyKey } = req.body;
    const result = await paymentService.executePayment(userId, {
      paymentId,
      idempotencyKey,
    });

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

export async function getReceiptHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view receipt.");
      return;
    }

    const { id } = req.params;
    const receipt = await paymentService.getReceipt(userId, id);
    sendSuccess(res, { receipt });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
