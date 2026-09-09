/**
 * Allowlisted voice & AI actions.
 *
 * Security boundary: the OmniDimension agent may only trigger actions that are
 * explicitly defined here. Sensitive actions (money movement, consent, KYC)
 * always route through a dedicated confirmation screen — the agent can never
 * silently execute them.
 */

import { WebsiteAction } from "../lib/api";
import { useAuthStore } from "../hooks/useAuth";

export type VoiceActionType =
  | "NAVIGATE"
  | "CHANGE_LANGUAGE"
  | "UPDATE_NAME"
  | "SHOW_BALANCE"
  | "FOCUS_BALANCE"
  | "SHOW_LOAN"
  | "OPEN_PAYMENT"
  | "OPEN_HELP"
  | "SHOW_EXPLANATION";

export interface VoiceActionDefinition {
  type: VoiceActionType;
  label: string;
  route: string;
  requiresConfirmation: boolean;
}

export const ALLOWED_ACTIONS: Record<string, VoiceActionDefinition> = {
  NAVIGATE: {
    type: "NAVIGATE",
    label: "Navigate screen",
    route: "/dashboard",
    requiresConfirmation: false,
  },
  CHANGE_LANGUAGE: {
    type: "CHANGE_LANGUAGE",
    label: "Bhasha badlein",
    route: "",
    requiresConfirmation: false,
  },
  UPDATE_NAME: {
    type: "UPDATE_NAME",
    label: "Naam update karein",
    route: "/profile",
    requiresConfirmation: true,
  },
  SHOW_BALANCE: {
    type: "SHOW_BALANCE",
    label: "Show your balance",
    route: "/dashboard?focus=balance",
    requiresConfirmation: false,
  },
  FOCUS_BALANCE: {
    type: "FOCUS_BALANCE",
    label: "Show your balance",
    route: "/dashboard?focus=balance",
    requiresConfirmation: false,
  },
  SHOW_LOAN: {
    type: "SHOW_LOAN",
    label: "View loan details",
    route: "/loan",
    requiresConfirmation: false,
  },
  OPEN_PAYMENT: {
    type: "OPEN_PAYMENT",
    label: "Send money",
    route: "/pay",
    requiresConfirmation: false, // Opens safe review screen, user confirms swipe
  },
  OPEN_HELP: {
    type: "OPEN_HELP",
    label: "Report an issue",
    route: "/help",
    requiresConfirmation: false,
  },
  SHOW_EXPLANATION: {
    type: "SHOW_EXPLANATION",
    label: "View explanation",
    route: "",
    requiresConfirmation: false,
  },
};

export function isAllowedAction(type: string): type is VoiceActionType {
  return Object.prototype.hasOwnProperty.call(ALLOWED_ACTIONS, type.toUpperCase());
}

export function resolveAction(type: string): VoiceActionDefinition | null {
  const upper = type.toUpperCase();
  return isAllowedAction(upper) ? ALLOWED_ACTIONS[upper] : null;
}

/**
 * Safely executes an allowlisted AI/Voice action on the website.
 */
export function dispatchWebsiteAction(
  action: WebsiteAction,
  navigate: (path: string) => void
): { success: boolean; feedbackMessage?: string } {
  if (!action || !isAllowedAction(action.type)) {
    console.warn("[Action Dispatcher] Blocked unallowed action:", action);
    return { success: false, feedbackMessage: "Action not permitted." };
  }

  const type = action.type.toUpperCase() as VoiceActionType;
  const payload = action.payload || {};

  switch (type) {
    case "NAVIGATE": {
      const targetRoute = payload.route || (payload.screen === "ONBOARDING" ? "/onboarding" : "/dashboard");
      navigate(targetRoute);
      return { success: true, feedbackMessage: `Navigating to ${targetRoute}...` };
    }

    case "CHANGE_LANGUAGE": {
      if (payload.language && ["hi", "hinglish", "en"].includes(payload.language)) {
        useAuthStore.getState().updateUser({ preferredLanguage: payload.language });
        return { success: true, feedbackMessage: `Language changed to ${payload.language}` };
      }
      return { success: false };
    }

    case "UPDATE_NAME": {
      if (action.confirmed && payload.name) {
        useAuthStore.getState().updateUser({ name: payload.name });
        return { success: true, feedbackMessage: `Name updated to ${payload.name}` };
      }
      return { success: true, feedbackMessage: `Please confirm name update: "${payload.name}"` };
    }

    case "SHOW_BALANCE":
    case "FOCUS_BALANCE": {
      navigate("/dashboard?focus=balance");
      return { success: true, feedbackMessage: "Opening dashboard balance..." };
    }

    case "SHOW_LOAN": {
      navigate("/loan");
      return { success: true, feedbackMessage: "Opening loan details..." };
    }

    case "OPEN_PAYMENT": {
      const amountParam = payload.amount ? `?amount=${encodeURIComponent(payload.amount)}` : "";
      const recipientParam = payload.recipient ? `${amountParam ? "&" : "?"}recipient=${encodeURIComponent(payload.recipient)}` : "";
      navigate(`/pay${amountParam}${recipientParam}`);
      return { success: true, feedbackMessage: "Opening payment screen..." };
    }

    case "OPEN_HELP": {
      navigate("/help");
      return { success: true, feedbackMessage: "Opening support & help..." };
    }

    case "SHOW_EXPLANATION": {
      return { success: true, feedbackMessage: payload.explanation || "Showing explanation" };
    }

    default:
      return { success: false };
  }
}
