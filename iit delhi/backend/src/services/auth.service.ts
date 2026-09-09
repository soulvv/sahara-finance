import { User, UserDocument } from "../models/User";
import { otpService } from "./otp.service";
import { signToken } from "../utils/jwt";
import { normalizePhoneNumber } from "../utils/phone";
import {
  SendOtpResponse,
  VerifyOtpResponse,
  PreferredLanguage,
} from "../types/auth";

export class AuthService {
  /**
   * Dispatches or simulates OTP generation for a valid phone number.
   */
  async requestOtp(rawPhone: string): Promise<
    | { success: true; data: SendOtpResponse }
    | { success: false; error: { code: string; message: string; statusCode: number; [key: string]: unknown } }
  > {
    const { valid, phone, error } = normalizePhoneNumber(rawPhone);
    if (!valid) {
      return {
        success: false,
        error: {
          code: "INVALID_PHONE_NUMBER",
          message: error || "Please enter a valid 10-digit Indian mobile number.",
          statusCode: 400,
        },
      };
    }

    const otpResult = await otpService.generateOtp(phone);
    if (!otpResult.success && otpResult.error) {
      return {
        success: false,
        error: {
          code: otpResult.error.code,
          message: otpResult.error.message,
          statusCode: otpResult.error.statusCode,
          retryAfterSeconds: otpResult.error.retryAfterSeconds,
        },
      };
    }

    return {
      success: true,
      data: {
        success: true,
        message: "Demo OTP generated successfully",
        requestId: otpResult.requestId,
        retryAfterSeconds: otpResult.retryAfterSeconds,
        expiresInSeconds: otpResult.expiresInSeconds,
        otpLength: otpResult.otpLength,
        demoOtp: otpResult.demoOtp,
      },
    };
  }

  /**
   * Validates OTP and authenticates/creates the user in MongoDB.
   */
  async verifyOtpAndAuthenticate(
    rawPhone: string,
    otp: string,
    requestId: string,
    name?: string | null
  ): Promise<
    | { success: true; data: VerifyOtpResponse }
    | { success: false; error: { code: string; message: string; statusCode: number; [key: string]: unknown } }
  > {
    const { valid, phone } = normalizePhoneNumber(rawPhone);
    if (!valid) {
      return {
        success: false,
        error: {
          code: "INVALID_PHONE_NUMBER",
          message: "Please enter a valid 10-digit Indian mobile number.",
          statusCode: 400,
        },
      };
    }

    if (!otp || typeof otp !== "string" || otp.trim().length === 0) {
      return {
        success: false,
        error: {
          code: "MISSING_OTP",
          message: "Please enter the OTP code.",
          statusCode: 400,
        },
      };
    }

    if (!requestId || typeof requestId !== "string") {
      return {
        success: false,
        error: {
          code: "INVALID_REQUEST_ID",
          message: "Missing or invalid request identifier.",
          statusCode: 400,
        },
      };
    }

    // Verify OTP using OTP service
    const verifyResult = await otpService.verifyOtp(phone, otp.trim(), requestId);
    if (!verifyResult.success && verifyResult.error) {
      return {
        success: false,
        error: {
          code: verifyResult.error.code,
          message: verifyResult.error.message,
          statusCode: verifyResult.error.statusCode,
          attemptsRemaining: verifyResult.error.attemptsRemaining,
        },
      };
    }

    // User is verified! Find or create user in MongoDB
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name?.trim() || null,
        preferredLanguage: "hinglish",
        status: "ACTIVE",
        onboardingStatus: "IN_PROGRESS",
        kycStatus: "PENDING",
      });
      console.log(`[Sahara Backend] New user registered: ${phone} (${user._id})`);
    } else {
      if (name?.trim() && (!user.name || user.name.trim().length === 0)) {
        user.name = name.trim();
        await user.save();
      }
      console.log(`[Sahara Backend] Existing user authenticated: ${phone} (${user._id})`);
    }

    // Issue JWT token
    const token = signToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    // Determine next route based on onboarding completion
    const nextRoute =
      user.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding";

    return {
      success: true,
      data: {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || null,
          preferredLanguage: user.preferredLanguage as PreferredLanguage,
          onboardingStatus: user.onboardingStatus,
          kycStatus: user.kycStatus,
        },
        nextRoute,
      },
    };
  }

  /**
   * Authenticates user via voice phone call verification.
   */
  async authenticateViaCall(
    rawPhone: string,
    name?: string | null,
    callId?: string
  ): Promise<
    | { success: true; data: VerifyOtpResponse }
    | { success: false; error: { code: string; message: string; statusCode: number } }
  > {
    const { valid, phone } = normalizePhoneNumber(rawPhone);
    if (!valid) {
      return {
        success: false,
        error: {
          code: "INVALID_PHONE_NUMBER",
          message: "Please enter a valid 10-digit Indian mobile number.",
          statusCode: 400,
        },
      };
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name?.trim() || null,
        preferredLanguage: "hinglish",
        status: "ACTIVE",
        onboardingStatus: "IN_PROGRESS",
        kycStatus: "PENDING",
      });
      console.log(`[Sahara Backend] New user registered via Voice Call: ${phone} (${user._id})`);
    } else {
      if (name?.trim() && (!user.name || user.name.trim().length === 0)) {
        user.name = name.trim();
        await user.save();
      }
      console.log(`[Sahara Backend] Existing user authenticated via Voice Call: ${phone} (${user._id})`);
    }

    const token = signToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    if (callId) {
      const { PhoneCallRecord } = await import("../models/PhoneCallRecord");
      await PhoneCallRecord.findOneAndUpdate(
        { callId },
        {
          $set: {
            userId: user._id,
            loginAuthToken: token,
            callAuthStatus: "AUTHENTICATED",
            status: "CONNECTED",
          },
        }
      );
    }

    const nextRoute =
      user.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding";

    return {
      success: true,
      data: {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || null,
          preferredLanguage: user.preferredLanguage as PreferredLanguage,
          onboardingStatus: user.onboardingStatus,
          kycStatus: user.kycStatus,
        },
        nextRoute,
      },
    };
  }

  /**
   * Retrieves profile data for the authenticated user.
   */
  async getCurrentUser(userId: string): Promise<UserDocument | null> {
    return User.findById(userId);
  }

  /**
   * Updates profile fields such as name or preferred language.
   */
  async updateCurrentUser(
    userId: string,
    updates: { name?: string; preferredLanguage?: PreferredLanguage }
  ): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
  }
}

export const authService = new AuthService();
