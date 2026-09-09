import { Request, Response, NextFunction } from "express";
import { merchantService } from "../services/merchant.service";
import { sendError, sendSuccess } from "../utils/response";

export async function lookupMerchantHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { upiId, id } = req.query;
    if (!upiId && !id) {
      sendError(res, 400, "INVALID_QUERY", "Merchant upiId or id is required for lookup.");
      return;
    }

    const merchant = await merchantService.lookupMerchant({
      upiId: typeof upiId === "string" ? upiId : undefined,
      id: typeof id === "string" ? id : undefined,
    });

    sendSuccess(res, {
      merchant: {
        id: merchant._id.toString(),
        name: merchant.name,
        upiId: merchant.upiId,
        category: merchant.category,
        avatar: merchant.avatar,
        status: merchant.status,
      },
    });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function listMerchantsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const merchants = await merchantService.listDemoMerchants();
    sendSuccess(res, { merchants });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
