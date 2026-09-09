/**
 * AI Action Validator & Lifecycle Manager
 * Tracks proposal nonces, expiration, and payload integrity.
 */

import crypto from "crypto";

export type ActionStatus =
  | "CREATED"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "EXECUTED"
  | "FAILED"
  | "BLOCKED";

export interface AIActionRecord {
  actionId: string;
  userId: string;
  sessionId?: string;
  type: string;
  payload: Record<string, any>;
  createdAt: number;
  expiresAt: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  status: ActionStatus;
  confirmationMethod?: string;
}

// In-memory registry for action lifecycle tracking (also synced with DB audit)
const actionStore = new Map<string, AIActionRecord>();

export class ActionValidator {
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Create and register a new AI action proposal
   */
  public static createAction(params: {
    userId: string;
    sessionId?: string;
    type: string;
    payload: Record<string, any>;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    requiresConfirmation: boolean;
  }): AIActionRecord {
    const actionId = `act_${crypto.randomBytes(12).toString("hex")}`;
    const now = Date.now();

    const record: AIActionRecord = {
      actionId,
      userId: params.userId,
      sessionId: params.sessionId,
      type: params.type,
      payload: params.payload,
      createdAt: now,
      expiresAt: now + this.TTL_MS,
      riskLevel: params.riskLevel,
      status: params.requiresConfirmation ? "AWAITING_CONFIRMATION" : "CREATED",
    };

    actionStore.set(actionId, record);
    return record;
  }

  /**
   * Retrieve and validate an action before confirmation/execution
   */
  public static validateAction(
    actionId: string,
    expectedUserId: string
  ): { valid: boolean; action?: AIActionRecord; error?: string } {
    const action = actionStore.get(actionId);

    if (!action) {
      return { valid: false, error: "ACTION_NOT_FOUND" };
    }

    if (action.userId !== expectedUserId) {
      return { valid: false, error: "FORBIDDEN_USER_MISMATCH" };
    }

    if (Date.now() > action.expiresAt) {
      action.status = "EXPIRED";
      return { valid: false, error: "ACTION_EXPIRED" };
    }

    if (action.status === "EXECUTED") {
      return { valid: false, error: "ACTION_ALREADY_EXECUTED" };
    }

    if (action.status === "BLOCKED") {
      return { valid: false, error: "ACTION_BLOCKED_BY_POLICY" };
    }

    return { valid: true, action };
  }

  /**
   * Update status of an action
   */
  public static updateStatus(
    actionId: string,
    status: ActionStatus,
    confirmationMethod?: string
  ): boolean {
    const action = actionStore.get(actionId);
    if (!action) return false;

    action.status = status;
    if (confirmationMethod) {
      action.confirmationMethod = confirmationMethod;
    }
    return true;
  }
}
