import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { sendError, sendSuccess } from "../utils/response";
import { SendOtpRequest, VerifyOtpRequest } from "../types/auth";

export async function sendOtpHandler(
  req: Request<{}, {}, SendOtpRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { phone } = req.body;

    if (!phone) {
      sendError(res, 400, "MISSING_PHONE", "Please provide a mobile phone number.");
      return;
    }

    const result = await authService.requestOtp(phone);

    if (!result.success) {
      sendError(
        res,
        result.error.statusCode,
        result.error.code,
        result.error.message,
        result.error.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: result.error.retryAfterSeconds }
          : {}
      );
      return;
    }

    sendSuccess(res, result.data, 200);
  } catch (error) {
    next(error);
  }
}

export async function verifyOtpHandler(
  req: Request<{}, {}, VerifyOtpRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { phone, otp, requestId, name } = req.body;

    if (!phone || !otp || !requestId) {
      sendError(
        res,
        400,
        "INVALID_REQUEST",
        "Phone number, OTP, and requestId are all required."
      );
      return;
    }

    const result = await authService.verifyOtpAndAuthenticate(
      phone,
      otp,
      requestId,
      name
    );

    if (!result.success) {
      sendError(
        res,
        result.error.statusCode,
        result.error.code,
        result.error.message,
        result.error.attemptsRemaining !== undefined
          ? { attemptsRemaining: result.error.attemptsRemaining }
          : {}
      );
      return;
    }

    sendSuccess(res, result.data, 200);
  } catch (error) {
    next(error);
  }
}

export async function completeCallLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { callId, phone, name } = req.body;

    let targetPhone = phone;
    let targetName = name;

    if (callId) {
      const { PhoneCallRecord } = await import("../models/PhoneCallRecord");
      const record = await PhoneCallRecord.findOne({ callId });
      if (record) {
        if (!targetPhone && record.rawPhoneNumber) {
          targetPhone = record.rawPhoneNumber;
        }
        if (!targetName && record.capturedName) {
          targetName = record.capturedName;
        }
      }
    }

    if (!targetPhone) {
      sendError(res, 400, "PHONE_REQUIRED", "Phone number is required for call login.");
      return;
    }

    const result = await authService.authenticateViaCall(
      targetPhone,
      targetName,
      callId
    );

    if (!result.success) {
      sendError(
        res,
        result.error.statusCode,
        result.error.code,
        result.error.message
      );
      return;
    }

    sendSuccess(
      res,
      {
        ...result.data,
        callId: callId || null,
        channel: "VOICE_CALL",
      },
      200
    );
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(
  _req: Request,
  res: Response
): Promise<void> {
  // Since JWT is stateless, logout on server returns confirmation.
  // Frontend clears its local token from localStorage.
  sendSuccess(res, {
    message: "Logged out successfully.",
  });
}
