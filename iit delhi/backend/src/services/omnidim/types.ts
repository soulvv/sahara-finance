export type AssistedSessionChannel = "WEB_VOICE" | "CHAT" | "PHONE";
export type AssistedSessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type WebsiteActionType =
  | "NAVIGATE"
  | "CHANGE_LANGUAGE"
  | "UPDATE_NAME"
  | "SHOW_BALANCE"
  | "FOCUS_BALANCE"
  | "SHOW_LOAN"
  | "OPEN_PAYMENT"
  | "OPEN_HELP"
  | "SHOW_EXPLANATION";

export interface WebsiteAction<T = Record<string, any>> {
  actionId: string;
  type: WebsiteActionType;
  payload: T;
  riskLevel: ActionRiskLevel;
  requiresConfirmation: boolean;
  userPromptMessage?: string;
  confirmed?: boolean;
  executed?: boolean;
}

export interface NavigatePayload {
  screen: "DASHBOARD" | "ONBOARDING" | "PAY" | "LOAN" | "HELP" | "PROFILE";
  step?: number;
  route: string;
}

export interface ChangeLanguagePayload {
  language: "hi" | "hinglish" | "en";
}

export interface UpdateNamePayload {
  name: string;
}

export interface OpenPaymentPayload {
  recipient?: string;
  recipientUpi?: string;
  amount?: number;
  merchantId?: string;
  route: string;
}

export interface OpenHelpPayload {
  category?: string;
  reportedIssue?: string;
  route: string;
}

export interface ShowExplanationPayload {
  topic: string;
  title: string;
  explanation: string;
}

// OmniDimension API Contract Types
export interface OmnidimAgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  languages: string[];
  voice: string;
  welcomeMessage: string;
  knowledgeBase?: Array<{ title: string; content: string }>;
}

export interface WebVoiceSessionResponse {
  sessionId: string;
  wsUrl: string;
  expiresInSeconds: number;
  agentId: string;
}

export interface OutboundCallRequest {
  agentId?: string;
  to: string;
  from?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface OutboundCallResponse {
  callId: string;
  providerCallId: string;
  status: "REQUESTED" | "RINGING" | "CONNECTED" | "COMPLETED" | "FAILED";
  message: string;
}

export interface ChatMessageRequest {
  message: string;
  language?: "hi" | "hinglish" | "en";
  context?: {
    currentRoute?: string;
    onboardingStatus?: string;
    kycStatus?: string;
  };
}

export interface ChatMessageResponse {
  reply: string;
  actions: WebsiteAction[];
  intent?: string;
  sessionId?: string;
}
