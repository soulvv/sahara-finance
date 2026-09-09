import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { authService } from "../services/auth.service";
import { sendError, sendSuccess } from "../utils/response";
import { PreferredLanguage } from "../types/auth";

export async function getMeHandler(
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

    const user = await authService.getCurrentUser(userId);
    if (!user) {
      sendError(res, 404, "USER_NOT_FOUND", "User account not found.");
      return;
    }

    sendSuccess(res, {
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name || null,
        preferredLanguage: user.preferredLanguage,
        status: user.status,
        onboardingStatus: user.onboardingStatus,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMeHandler(
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

    const { name, preferredLanguage } = req.body as {
      name?: unknown;
      preferredLanguage?: unknown;
    };

    const updates: { name?: string; preferredLanguage?: PreferredLanguage } = {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string") {
        sendError(res, 400, "INVALID_NAME", "Full name must be a valid text string.");
        return;
      }
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        sendError(
          res,
          400,
          "INVALID_NAME",
          "Please enter a valid full name with at least 2 characters."
        );
        return;
      }
      if (trimmed.length > 60) {
        sendError(res, 400, "INVALID_NAME", "Name cannot exceed 60 characters.");
        return;
      }
      updates.name = trimmed;
    }

    // Validate preferredLanguage if provided
    if (preferredLanguage !== undefined) {
      if (
        typeof preferredLanguage !== "string" ||
        !["hi", "hinglish", "en"].includes(preferredLanguage)
      ) {
        sendError(
          res,
          400,
          "INVALID_LANGUAGE",
          "Preferred language must be one of 'hi', 'hinglish', or 'en'."
        );
        return;
      }
      updates.preferredLanguage = preferredLanguage as PreferredLanguage;
    }

    if (Object.keys(updates).length === 0) {
      sendError(res, 400, "NO_UPDATES_PROVIDED", "No valid profile fields provided to update.");
      return;
    }

    const updatedUser = await authService.updateCurrentUser(userId, updates);
    if (!updatedUser) {
      sendError(res, 404, "USER_NOT_FOUND", "User account not found.");
      return;
    }

    sendSuccess(res, {
      user: {
        id: updatedUser._id.toString(),
        phone: updatedUser.phone,
        name: updatedUser.name || null,
        preferredLanguage: updatedUser.preferredLanguage,
        status: updatedUser.status,
        onboardingStatus: updatedUser.onboardingStatus,
        kycStatus: updatedUser.kycStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}
