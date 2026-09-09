import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  sessionService,
  chatService,
  callService,
  actionService,
  omnidimClient,
} from "../services/omnidim";
import { env } from "../config/env";
import { sendError, sendSuccess } from "../utils/response";

export async function createVoiceSessionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to start voice session.");
      return;
    }

    const { language, currentRoute } = req.body || {};
    const session = await sessionService.createWebVoiceSession(userId, {
      language,
      currentRoute,
    });

    sendSuccess(res, { session }, 201);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function processChatHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to chat with Saathi.");
      return;
    }

    const { message, language, context } = req.body;
    if (!message || String(message).trim().length === 0) {
      sendError(res, 400, "INVALID_MESSAGE", "Message text is required.");
      return;
    }

    const result = await chatService.processMessage(userId, {
      message,
      language,
      context,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function requestCallHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || null;
    const { phoneNumber, phone, name, isLoginCall, reason, context } = req.body || {};
    const targetPhone = phoneNumber || phone;

    if (!userId && !targetPhone) {
      sendError(res, 400, "PHONE_NUMBER_REQUIRED", "Please provide a valid 10-digit mobile number to receive assistance.");
      return;
    }

    const result = await callService.requestPhoneAssistance(userId, {
      phoneNumber: targetPhone,
      name,
      isLoginCall: Boolean(isLoginCall),
      reason,
      context,
    });

    sendSuccess(res, result, 201);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function getCallStatusHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || null;
    const { callId } = req.params;
    const result = await callService.getCallStatus(userId, callId);
    sendSuccess(res, { call: result });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function confirmActionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to confirm action.");
      return;
    }

    const { actionId, confirmed, actionType, payload } = req.body;
    if (!actionType) {
      sendError(res, 400, "INVALID_ACTION", "actionType is required.");
      return;
    }

    const result = await actionService.confirmAction(
      userId,
      actionId,
      Boolean(confirmed),
      actionType,
      payload || {}
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

export async function callWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { callId, providerCallId, status, duration, summary } = req.body;
    await callService.handleCallWebhook({
      callId,
      providerCallId,
      status: status || "COMPLETED",
      duration,
      summary,
    });

    sendSuccess(res, { received: true });
  } catch (error) {
    next(error);
  }
}

export async function getOmnidimStatusHandler(
  _req: Request,
  res: Response
): Promise<void> {
  sendSuccess(res, {
    service: "omnidim-integration",
    mode: env.OMNIDIM_MODE,
    isConfigured: omnidimClient.isConfigured(),
    agent: "Sahara Saathi",
    supportedChannels: ["WEB_VOICE", "CHAT", "PHONE"],
    languages: ["hi", "hinglish", "en"],
  });
}
