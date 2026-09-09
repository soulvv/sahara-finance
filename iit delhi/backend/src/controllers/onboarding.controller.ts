import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { onboardingService } from "../services/onboarding.service";
import { sendError, sendSuccess } from "../utils/response";

export async function getOnboardingHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
      return;
    }

    const session = await onboardingService.getOrCreateSession(userId);
    sendSuccess(res, { onboarding: session });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function updateProgressHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
      return;
    }

    const { currentStep } = req.body;
    if (!currentStep || typeof currentStep !== "string") {
      sendError(
        res,
        400,
        "INVALID_STEP",
        "Please provide a valid currentStep ('STEP_0_NAME', 'STEP_1_PRIVACY', 'STEP_2_DOCUMENT', 'COMPLETED')."
      );
      return;
    }

    const result = await onboardingService.updateProgress(userId, currentStep as any);
    sendSuccess(res, { onboarding: result });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function submitConsentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
      return;
    }

    const { pledgeAccepted } = req.body;
    if (pledgeAccepted !== true) {
      sendError(
        res,
        400,
        "CONSENT_REQUIRED",
        "Privacy pledge acceptance is required to proceed."
      );
      return;
    }

    const result = await onboardingService.recordConsent(
      userId,
      pledgeAccepted,
      req.ip,
      req.headers["user-agent"]
    );

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
