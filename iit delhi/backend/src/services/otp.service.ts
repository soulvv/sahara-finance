import { env } from "../config/env";
import { OTP, OTPDocument } from "../models/OTP";
import {
  generateRequestId,
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
} from "../utils/crypto";

export interface OtpGenerationResult {
  success: boolean;
  requestId: string;
  expiresInSeconds: number;
  retryAfterSeconds: number;
  otpLength: number;
  demoOtp?: string;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    retryAfterSeconds?: number;
  };
}

export interface OtpVerificationResult {
  success: boolean;
  phone?: string;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    attemptsRemaining?: number;
  };
}

export interface IOtpService {
  generateOtp(phone: string): Promise<OtpGenerationResult>;
  verifyOtp(phone: string, otp: string, requestId: string): Promise<OtpVerificationResult>;
}

export class DemoOtpService implements IOtpService {
  /**
   * Generates a secure OTP for the given phone number with rate-limiting and hashing.
   */
  async generateOtp(phone: string): Promise<OtpGenerationResult> {
    const now = new Date();

    // 1. Check for recent OTP requests within the 30-second cooldown period
    const cooldownLimit = new Date(
      now.getTime() - env.OTP_RESEND_COOLDOWN_SECONDS * 1000
    );
    const mostRecentOtp = await OTP.findOne({
      phone,
      createdAt: { $gte: cooldownLimit },
    }).sort({ createdAt: -1 });

    if (mostRecentOtp) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(mostRecentOtp.createdAt).getTime()) / 1000
      );
      const remainingCooldown = Math.max(
        1,
        env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
      );

      return {
        success: false,
        requestId: mostRecentOtp.requestId,
        expiresInSeconds: 0,
        retryAfterSeconds: remainingCooldown,
        otpLength: env.OTP_LENGTH,
        error: {
          code: "OTP_RESEND_TOO_SOON",
          message: `Please wait ${remainingCooldown} seconds before requesting another code.`,
          statusCode: 429,
          retryAfterSeconds: remainingCooldown,
        },
      };
    }

    // 2. Check for maximum OTP requests per rolling window (15 mins)
    const windowStart = new Date(
      now.getTime() - env.OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    );
    const requestCountInWindow = await OTP.countDocuments({
      phone,
      createdAt: { $gte: windowStart },
    });

    const maxAllowed = env.OTP_DEV_MODE ? 50 : env.OTP_MAX_REQUESTS_PER_WINDOW;

    if (requestCountInWindow >= maxAllowed) {
      return {
        success: false,
        requestId: "",
        expiresInSeconds: 0,
        retryAfterSeconds: env.OTP_RATE_LIMIT_WINDOW_MINUTES * 60,
        otpLength: env.OTP_LENGTH,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Maximum OTP requests exceeded for this number. Please wait 15 minutes.",
          statusCode: 429,
          retryAfterSeconds: env.OTP_RATE_LIMIT_WINDOW_MINUTES * 60,
        },
      };
    }

    // 3. Generate new 6-digit OTP & requestId
    const rawOtp = generateSecureOtp(env.OTP_LENGTH);
    const requestId = generateRequestId();
    const otpHash = hashOtp(phone, rawOtp);
    const expiresAt = new Date(
      now.getTime() + env.OTP_EXPIRY_SECONDS * 1000
    );

    // 4. Invalidate any existing active unverified OTPs for this phone
    await OTP.updateMany(
      { phone, verified: false },
      { $set: { verified: true } }
    );

    // 5. Store new hashed OTP record in MongoDB
    await OTP.create({
      phone,
      otpHash,
      requestId,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    // In demo mode, log and return the generated code
    if (env.OTP_DEV_MODE) {
      console.log(`[DEMO MODE OTP] Phone: ${phone} | Code: ${rawOtp} | RequestId: ${requestId}`);
    }

    return {
      success: true,
      requestId,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      retryAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      otpLength: env.OTP_LENGTH,
      ...(env.OTP_DEV_MODE ? { demoOtp: rawOtp } : {}),
    };
  }

  /**
   * Verifies the submitted OTP against stored hash in MongoDB.
   */
  async verifyOtp(
    phone: string,
    otp: string,
    requestId: string
  ): Promise<OtpVerificationResult> {
    // 1. Find the OTP record matching requestId and phone
    const otpRecord = await OTP.findOne({ requestId, phone });

    if (!otpRecord) {
      return {
        success: false,
        error: {
          code: "INVALID_OTP_REQUEST",
          message: "Invalid or expired OTP session. Please request a new code.",
          statusCode: 400,
        },
      };
    }

    // 2. Check if already verified
    if (otpRecord.verified) {
      return {
        success: false,
        error: {
          code: "OTP_ALREADY_USED",
          message: "This OTP has already been verified. Please request a new code.",
          statusCode: 400,
        },
      };
    }

    // 3. Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return {
        success: false,
        error: {
          code: "OTP_EXPIRED",
          message: "The OTP has expired. Please request a new one.",
          statusCode: 410,
        },
      };
    }

    // 4. Check maximum attempts
    if (otpRecord.attempts >= 3) {
      return {
        success: false,
        error: {
          code: "MAX_ATTEMPTS_EXCEEDED",
          message:
            "Maximum verification attempts exceeded. Please request a new OTP.",
          statusCode: 429,
        },
      };
    }

    // 5. Compare OTP hashes in constant time
    const isValid = verifyOtpHash(phone, otp, otpRecord.otpHash);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remaining = Math.max(0, 3 - otpRecord.attempts);

      if (remaining === 0) {
        return {
          success: false,
          error: {
            code: "MAX_ATTEMPTS_EXCEEDED",
            message:
              "Maximum attempts exceeded. This OTP is now invalid. Please request a new one.",
            statusCode: 429,
            attemptsRemaining: 0,
          },
        };
      }

      return {
        success: false,
        error: {
          code: "INVALID_OTP",
          message: `Incorrect code entered. ${remaining} ${
            remaining === 1 ? "attempt" : "attempts"
          } remaining.`,
          statusCode: 400,
          attemptsRemaining: remaining,
        },
      };
    }

    // 6. Valid OTP -> Mark verified and invalidate
    otpRecord.verified = true;
    await otpRecord.save();

    return {
      success: true,
      phone,
    };
  }
}

export const otpService = new DemoOtpService();
