import crypto from "crypto";
import { env } from "../../config/env";
import { AssistedOnboardingSession } from "../../models/AssistedOnboardingSession";
import { omnidimClient } from "./client";
import { AssistedSessionChannel, WebVoiceSessionResponse } from "./types";

export class SessionService {
  /**
   * Creates or resumes an assisted session across Web Voice, Chat, or Phone.
   */
  async createAssistedSession(
    userId?: string | null,
    channel: AssistedSessionChannel = "WEB_VOICE",
    context: {
      language?: string;
      currentRoute?: string;
      currentStep?: number;
    } = {}
  ) {
    const sessionId = `asst_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const session = await AssistedOnboardingSession.create({
      sessionId,
      userId: userId || null,
      channel,
      language: context.language || "hinglish",
      currentRoute: context.currentRoute || "/dashboard",
      currentStep: context.currentStep ?? null,
      status: "ACTIVE",
      startedAt: new Date(),
      lastActiveAt: new Date(),
    });

    return session;
  }

  /**
   * Generates a WebVoice session returning an ephemeral ws_url.
   */
  async createWebVoiceSession(
    userId: string,
    context: {
      language?: string;
      currentRoute?: string;
    } = {}
  ): Promise<WebVoiceSessionResponse> {
    const session = await this.createAssistedSession(userId, "WEB_VOICE", context);

    // If real OmniDimension is enabled and configured, call provider API
    if (env.OMNIDIM_MODE === "real" && omnidimClient.isConfigured()) {
      const agentIdNum = parseInt(env.OMNIDIM_AGENT_ID || "246626", 10);
      const apiRes = await omnidimClient.request<{
        session_id: number | string;
        token: string;
        expires_at: string;
        ws_url: string;
      }>("/sessions/create", {
        method: "POST",
        body: {
          agent_id: agentIdNum,
          type: "voice",
          custom_variables: {
            user_id: userId,
            internal_session_id: session.sessionId,
            language: context.language || "hinglish",
            current_route: context.currentRoute || "/dashboard",
          },
        },
      });

      if (apiRes.success && apiRes.data?.ws_url) {
        return {
          sessionId: session.sessionId,
          wsUrl: apiRes.data.ws_url,
          expiresInSeconds: 300,
          agentId: String(agentIdNum),
        };
      }
    }

    // Mock / Free local development session
    const mockToken = crypto.randomBytes(16).toString("hex");
    return {
      sessionId: session.sessionId,
      wsUrl: `wss://api.omnidimension.io/v1/voice/stream?session=${session.sessionId}&token=${mockToken}`,
      expiresInSeconds: 300,
      agentId: "sahara-saathi-mock",
    };
  }

  /**
   * Updates the active route/step of an ongoing assistance session.
   */
  async updateSessionProgress(
    sessionId: string,
    currentRoute: string,
    currentStep?: number
  ) {
    return AssistedOnboardingSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          currentRoute,
          currentStep: currentStep ?? null,
          lastActiveAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Completes or closes an assistance session.
   */
  async closeSession(sessionId: string) {
    return AssistedOnboardingSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      },
      { new: true }
    );
  }
}

export const sessionService = new SessionService();
