import { User } from "../../models/User";
import { AiActionAudit } from "../../models/AiActionAudit";
import {
  ActionRiskLevel,
  AssistedSessionChannel,
  WebsiteAction,
  WebsiteActionType,
} from "./types";

export class ActionService {
  /**
   * Action Risk & Authorization Registry
   */
  private actionRiskMap: Record<
    WebsiteActionType,
    { risk: ActionRiskLevel; requiresConfirmation: boolean }
  > = {
    NAVIGATE: { risk: "LOW", requiresConfirmation: false },
    CHANGE_LANGUAGE: { risk: "LOW", requiresConfirmation: false },
    SHOW_BALANCE: { risk: "LOW", requiresConfirmation: false },
    FOCUS_BALANCE: { risk: "LOW", requiresConfirmation: false },
    SHOW_LOAN: { risk: "LOW", requiresConfirmation: false },
    OPEN_PAYMENT: { risk: "LOW", requiresConfirmation: false },
    OPEN_HELP: { risk: "LOW", requiresConfirmation: false },
    SHOW_EXPLANATION: { risk: "LOW", requiresConfirmation: false },
    UPDATE_NAME: { risk: "MEDIUM", requiresConfirmation: true },
  };

  /**
   * Forbidden action patterns that must NEVER be executed.
   */
  private forbiddenActionKeywords = [
    "EXECUTE_PAYMENT",
    "DEBIT_ACCOUNT",
    "TRANSFER_FUNDS",
    "CHANGE_PIN",
    "RESET_PASSWORD",
    "REVEAL_OTP",
    "DELETE_ACCOUNT",
    "ARBITRARY_URL",
    "ADMIN_OVERRIDE",
  ];

  /**
   * Validates and normalizes raw AI-proposed actions against the strict allowlist.
   */
  validateAndNormalizeAction(
    rawType: string,
    rawPayload: Record<string, any> = {}
  ): WebsiteAction | null {
    const typeUpper = (rawType || "").trim().toUpperCase() as WebsiteActionType;

    // Reject any prohibited high-risk action
    if (this.forbiddenActionKeywords.includes(typeUpper)) {
      console.warn(`[Action Engine Security] Rejected forbidden action: ${typeUpper}`);
      return null;
    }

    // Check against allowlist
    const definition = this.actionRiskMap[typeUpper];
    if (!definition) {
      console.warn(`[Action Engine Security] Action not found in allowlist: ${typeUpper}`);
      return null;
    }

    const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sanitizedPayload: Record<string, any> = {};

    switch (typeUpper) {
      case "NAVIGATE": {
        const allowedScreens = [
          "DASHBOARD",
          "ONBOARDING",
          "PAY",
          "LOAN",
          "HELP",
          "PROFILE",
        ];
        const screen = (rawPayload.screen || "DASHBOARD").toUpperCase();
        if (!allowedScreens.includes(screen)) return null;

        const routeMap: Record<string, string> = {
          DASHBOARD: "/dashboard",
          ONBOARDING: "/onboarding",
          PAY: "/pay",
          LOAN: "/loan",
          HELP: "/help",
          PROFILE: "/profile",
        };

        sanitizedPayload.screen = screen;
        sanitizedPayload.route = routeMap[screen] || "/dashboard";
        if (typeof rawPayload.step === "number") {
          sanitizedPayload.step = Math.max(0, Math.min(rawPayload.step, 3));
        }
        break;
      }

      case "CHANGE_LANGUAGE": {
        const lang = (rawPayload.language || "hinglish").toLowerCase();
        if (!["hi", "hinglish", "en"].includes(lang)) return null;
        sanitizedPayload.language = lang;
        break;
      }

      case "UPDATE_NAME": {
        const name = (rawPayload.name || "").trim();
        if (!name || name.length < 2 || name.length > 50) return null;
        sanitizedPayload.name = name;
        break;
      }

      case "OPEN_PAYMENT": {
        sanitizedPayload.route = "/pay";
        if (rawPayload.amount && Number(rawPayload.amount) > 0) {
          sanitizedPayload.amount = Math.min(Number(rawPayload.amount), 50000);
        }
        if (rawPayload.recipient) {
          sanitizedPayload.recipient = String(rawPayload.recipient).slice(0, 50);
        }
        if (rawPayload.recipientUpi) {
          sanitizedPayload.recipientUpi = String(rawPayload.recipientUpi).slice(0, 50);
        }
        break;
      }

      case "OPEN_HELP": {
        sanitizedPayload.route = "/help";
        if (rawPayload.category) {
          sanitizedPayload.category = String(rawPayload.category).slice(0, 30);
        }
        if (rawPayload.reportedIssue) {
          sanitizedPayload.reportedIssue = String(rawPayload.reportedIssue).slice(0, 200);
        }
        break;
      }

      case "SHOW_BALANCE":
      case "FOCUS_BALANCE": {
        sanitizedPayload.route = "/dashboard?focus=balance";
        break;
      }

      case "SHOW_LOAN": {
        sanitizedPayload.route = "/loan";
        break;
      }

      case "SHOW_EXPLANATION": {
        sanitizedPayload.topic = String(rawPayload.topic || "general").slice(0, 50);
        sanitizedPayload.title = String(rawPayload.title || "Information").slice(0, 80);
        sanitizedPayload.explanation = String(rawPayload.explanation || "").slice(0, 500);
        break;
      }
    }

    return {
      actionId,
      type: typeUpper,
      payload: sanitizedPayload,
      riskLevel: definition.risk,
      requiresConfirmation: definition.requiresConfirmation,
      userPromptMessage: definition.requiresConfirmation
        ? `Kya aap apna naam "${sanitizedPayload.name}" update karna chahte hain?`
        : undefined,
      confirmed: !definition.requiresConfirmation,
      executed: false,
    };
  }

  /**
   * Executes a validated low-risk action or records a medium-risk action awaiting confirmation.
   */
  async executeOrAuditAction(
    userId: string,
    action: WebsiteAction,
    channel: AssistedSessionChannel = "CHAT",
    sessionId?: string
  ): Promise<{ success: boolean; action: WebsiteAction }> {
    // Audit log record
    const auditRecord = await AiActionAudit.create({
      userId,
      sessionId: sessionId || null,
      channel,
      intent: action.type,
      actionType: action.type,
      payloadSummary: action.payload,
      riskLevel: action.riskLevel,
      requiresConfirmation: action.requiresConfirmation,
      confirmed: action.confirmed || false,
      executed: false,
    });

    // Execute low-risk persistence immediately if applicable
    if (!action.requiresConfirmation) {
      if (action.type === "CHANGE_LANGUAGE" && action.payload.language) {
        await User.findByIdAndUpdate(userId, {
          preferredLanguage: action.payload.language,
        });
        action.executed = true;
        auditRecord.executed = true;
        auditRecord.result = "LANGUAGE_UPDATED";
        await auditRecord.save();
      } else {
        action.executed = true;
        auditRecord.executed = true;
        auditRecord.result = "ACTION_DISPATCHED";
        await auditRecord.save();
      }
    }

    return { success: true, action };
  }

  /**
   * Confirms and executes a pending medium-risk action (e.g. UPDATE_NAME).
   */
  async confirmAction(
    userId: string,
    actionId: string,
    confirmed: boolean,
    actionType: WebsiteActionType,
    payload: Record<string, any>
  ): Promise<{ success: boolean; message: string; updatedUser?: any }> {
    if (!confirmed) {
      await AiActionAudit.create({
        userId,
        channel: "CHAT",
        intent: actionType,
        actionType,
        payloadSummary: payload,
        riskLevel: "MEDIUM",
        requiresConfirmation: true,
        confirmed: false,
        executed: false,
        result: "USER_REJECTED",
      });
      return { success: true, message: "Action cancelled by user." };
    }

    let updatedUser: any = null;

    if (actionType === "UPDATE_NAME" && payload.name) {
      const trimmedName = String(payload.name).trim();
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { name: trimmedName },
        { new: true }
      );

      await AiActionAudit.create({
        userId,
        channel: "CHAT",
        intent: actionType,
        actionType,
        payloadSummary: payload,
        riskLevel: "MEDIUM",
        requiresConfirmation: true,
        confirmed: true,
        executed: true,
        result: "NAME_UPDATED",
      });

      return {
        success: true,
        message: `Aapka naam safaltapoorvak "${trimmedName}" update ho gaya!`,
        updatedUser: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          phone: updatedUser.phone,
          preferredLanguage: updatedUser.preferredLanguage,
        },
      };
    }

    return { success: false, message: "Unsupported confirmation action." };
  }
}

export const actionService = new ActionService();
