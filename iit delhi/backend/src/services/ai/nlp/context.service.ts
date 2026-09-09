/**
 * Multi-Turn Voice & Chat Conversational Context Service
 * Preserves session entities across dialog turns without granting authorization.
 */

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  lastRecipient?: string;
  lastAmount?: number;
  lastCategory?: string;
  turns: ConversationTurn[];
  updatedAt: number;
}

const sessionStore = new Map<string, SessionContext>();

export class ConversationContextService {
  private static readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Get or initialize session context
   */
  public static getContext(sessionId: string, userId: string): SessionContext {
    let ctx = sessionStore.get(sessionId);
    if (!ctx || ctx.userId !== userId || Date.now() - ctx.updatedAt > this.TTL_MS) {
      ctx = {
        sessionId,
        userId,
        turns: [],
        updatedAt: Date.now(),
      };
      sessionStore.set(sessionId, ctx);
    }
    return ctx;
  }

  /**
   * Record a new conversation turn and update context entities
   */
  public static recordTurn(params: {
    sessionId: string;
    userId: string;
    userText?: string;
    assistantText?: string;
    extractedRecipient?: string;
    extractedAmount?: number;
    extractedCategory?: string;
  }): SessionContext {
    const ctx = this.getContext(params.sessionId, params.userId);

    if (params.userText) {
      ctx.turns.push({ role: "user", text: params.userText, timestamp: Date.now() });
    }
    if (params.assistantText) {
      ctx.turns.push({ role: "assistant", text: params.assistantText, timestamp: Date.now() });
    }

    if (params.extractedRecipient) {
      ctx.lastRecipient = params.extractedRecipient;
    }
    if (params.extractedAmount) {
      ctx.lastAmount = params.extractedAmount;
    }
    if (params.extractedCategory) {
      ctx.lastCategory = params.extractedCategory;
    }

    ctx.updatedAt = Date.now();
    return ctx;
  }
}
