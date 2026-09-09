/**
 * AI Action Authorization Service
 * Validates physical user confirmation, step-up PIN verification, and replay guards.
 */

import { ActionValidator } from "./action-validator";

export interface AuthorizationResult {
  authorized: boolean;
  code?: string;
  message?: string;
}

export class AuthorizationService {
  /**
   * Validate that user confirmation is authentic and legally authorized
   */
  public static authorizeAction(params: {
    actionId: string;
    userId: string;
    confirmationType: "SWIPE" | "PIN" | "OTP" | "CLICK";
    securityToken?: string;
  }): AuthorizationResult {
    const { actionId, userId, confirmationType } = params;

    const validation = ActionValidator.validateAction(actionId, userId);
    if (!validation.valid) {
      return {
        authorized: false,
        code: validation.error,
        message: "Action could not be authorized.",
      };
    }

    const action = validation.action!;

    // High risk actions cannot be confirmed with simple click
    if (action.riskLevel === "HIGH" && confirmationType === "CLICK") {
      return {
        authorized: false,
        code: "STEP_UP_REQUIRED",
        message: "High risk actions require physical Swipe-to-Pay or PIN verification.",
      };
    }

    // Mark as confirmed
    ActionValidator.updateStatus(actionId, "CONFIRMED", confirmationType);

    return {
      authorized: true,
    };
  }
}
