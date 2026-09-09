/**
 * AI Action Policy Firewall — Deterministic Rules Engine
 *
 * Rule B & Rule D Enforcement:
 * - AI cannot directly debit, credit, or execute money movements.
 * - AI output is untrusted; the policy engine independently decides if actions are permitted.
 * - High-risk actions must require explicit server-side user authentication and physical confirmation.
 */

export type RiskCategory = "LOW" | "MEDIUM" | "HIGH";

export interface PolicyEvaluationResult {
  allowed: boolean;
  riskLevel: RiskCategory;
  requiresConfirmation: boolean;
  requiresExplicitAuth: boolean;
  reason?: string;
  sanitizedActionType: string;
  sanitizedPayload: Record<string, any>;
}

// Low Risk: Read-only navigation, preferences, explanations
const LOW_RISK_ACTIONS = new Set([
  "NAVIGATE",
  "CHANGE_LANGUAGE",
  "EXPLAIN_SCREEN",
  "SHOW_BALANCE",
  "SHOW_TRANSACTIONS",
  "SHOW_LOAN",
  "SHOW_EMI",
  "SHOW_SAFE_TO_SPEND",
  "HELP",
]);

// Medium Risk: Pre-filling forms, creating non-monetary requests, drafting
const MEDIUM_RISK_ACTIONS = new Set([
  "OPEN_PAYMENT",
  "PREPARE_PAYMENT",
  "PREPARE_QR_PAYMENT",
  "CREATE_SUPPORT_TICKET",
  "CREATE_SAVINGS_GOAL",
  "CREATE_BUDGET",
  "CREATE_REMINDER",
  "UPDATE_NAME",
]);

// High Risk: Direct money movement, security changes, account alterations
const HIGH_RISK_ACTIONS = new Set([
  "EXECUTE_PAYMENT",
  "DIRECT_DEBIT",
  "ACCEPT_LOAN",
  "FREEZE_ACCOUNT",
  "UNFREEZE_ACCOUNT",
  "MODIFY_BENEFICIARY",
  "DISABLE_SECURITY",
]);

export class PolicyService {
  /**
   * Evaluate proposed AI action against deterministic banking policy.
   */
  public static evaluate(
    actionType: string,
    payload: Record<string, any> = {},
    userContext?: { userId: string; isFrozen?: boolean }
  ): PolicyEvaluationResult {
    const normalizedType = (actionType || "").toUpperCase().trim();

    // Check if account is frozen
    if (userContext?.isFrozen) {
      if (
        normalizedType === "EXECUTE_PAYMENT" ||
        normalizedType === "OPEN_PAYMENT" ||
        normalizedType === "PREPARE_PAYMENT"
      ) {
        return {
          allowed: false,
          riskLevel: "HIGH",
          requiresConfirmation: true,
          requiresExplicitAuth: true,
          reason: "Account is currently frozen. Outbound payments are disabled.",
          sanitizedActionType: "ACCOUNT_FROZEN_BLOCKED",
          sanitizedPayload: {},
        };
      }
    }

    // High Risk: Autonomous AI execution is NEVER allowed
    if (HIGH_RISK_ACTIONS.has(normalizedType)) {
      // If AI proposed EXECUTE_PAYMENT or DIRECT_DEBIT, downgrade strictly to PREPARE_PAYMENT / OPEN_PAYMENT review
      if (
        normalizedType === "EXECUTE_PAYMENT" ||
        normalizedType === "DIRECT_DEBIT"
      ) {
        return {
          allowed: true,
          riskLevel: "HIGH",
          requiresConfirmation: true,
          requiresExplicitAuth: true,
          reason:
            "AI is not permitted to execute payments directly. Proposing payment preparation for explicit user confirmation.",
          sanitizedActionType: "OPEN_PAYMENT",
          sanitizedPayload: {
            recipient: payload.recipient || payload.merchantName || "Merchant",
            upiId: payload.upiId || payload.recipientUpi || "",
            amount: Math.abs(Number(payload.amount) || 0),
            note: payload.note || "Voice-assisted payment",
            requiresPhysicalConfirmation: true,
          },
        };
      }

      // Security changes require explicit user authorization
      return {
        allowed: false,
        riskLevel: "HIGH",
        requiresConfirmation: true,
        requiresExplicitAuth: true,
        reason: `Operation ${normalizedType} requires direct authenticated user initiation.`,
        sanitizedActionType: "BLOCKED_REQUIRES_USER_INITIATION",
        sanitizedPayload: {},
      };
    }

    // Medium Risk: Permitted with confirmation
    if (MEDIUM_RISK_ACTIONS.has(normalizedType)) {
      return {
        allowed: true,
        riskLevel: "MEDIUM",
        requiresConfirmation: true,
        requiresExplicitAuth: false,
        sanitizedActionType: normalizedType,
        sanitizedPayload: payload,
      };
    }

    // Low Risk: Allowed immediately
    if (LOW_RISK_ACTIONS.has(normalizedType)) {
      return {
        allowed: true,
        riskLevel: "LOW",
        requiresConfirmation: false,
        requiresExplicitAuth: false,
        sanitizedActionType: normalizedType,
        sanitizedPayload: payload,
      };
    }

    // Default: Unknown actions are safely blocked
    return {
      allowed: false,
      riskLevel: "MEDIUM",
      requiresConfirmation: true,
      requiresExplicitAuth: false,
      reason: `Unrecognized AI action type: ${actionType}`,
      sanitizedActionType: "UNKNOWN_ACTION",
      sanitizedPayload: {},
    };
  }
}
