import { User } from "../models/User";
import { OnboardingSession, OnboardingSessionDocument } from "../models/OnboardingSession";
import { AuditLog } from "../models/AuditLog";
import { OnboardingStep } from "../types/onboarding";

export class OnboardingService {
  /**
   * Retrieves or initializes an onboarding session for a user.
   */
  async getOrCreateSession(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, code: "USER_NOT_FOUND", message: "User account not found." };
    }

    let session = await OnboardingSession.findOne({ userId });

    if (!session) {
      const initialStep: OnboardingStep =
        user.onboardingStatus === "COMPLETED" ? "COMPLETED" : "STEP_0_NAME";

      const initialCompleted: OnboardingStep[] =
        user.onboardingStatus === "COMPLETED"
          ? ["STEP_0_NAME", "STEP_1_PRIVACY", "STEP_2_DOCUMENT", "COMPLETED"]
          : [];

      session = await OnboardingSession.create({
        userId,
        currentStep: initialStep,
        completedSteps: initialCompleted,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        completedAt: user.onboardingStatus === "COMPLETED" ? new Date() : null,
      });
    } else {
      session.lastActiveAt = new Date();
      if (user.onboardingStatus === "COMPLETED" && session.currentStep !== "COMPLETED") {
        session.currentStep = "COMPLETED";
        if (!session.completedSteps.includes("COMPLETED")) {
          session.completedSteps.push("COMPLETED");
        }
        if (!session.completedAt) {
          session.completedAt = new Date();
        }
      }
      await session.save();
    }

    return {
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      consentGiven: Boolean(session.consentGivenAt),
      consentGivenAt: session.consentGivenAt || null,
      kycStatus: user.kycStatus,
      completed: session.currentStep === "COMPLETED" || user.onboardingStatus === "COMPLETED",
      lastActiveAt: session.lastActiveAt,
    };
  }

  /**
   * Safely advances the onboarding step after verifying prerequisite rules.
   */
  async updateProgress(userId: string, targetStep: OnboardingStep) {
    const validSteps: OnboardingStep[] = [
      "STEP_0_NAME",
      "STEP_1_PRIVACY",
      "STEP_2_DOCUMENT",
      "COMPLETED",
    ];

    if (!validSteps.includes(targetStep)) {
      throw {
        status: 400,
        code: "INVALID_STEP",
        message: "Invalid onboarding step provided.",
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, code: "USER_NOT_FOUND", message: "User account not found." };
    }

    let session = await OnboardingSession.findOne({ userId });
    if (!session) {
      session = await OnboardingSession.create({
        userId,
        currentStep: "STEP_0_NAME",
        completedSteps: [],
      });
    }

    // Validation rules to prevent skipping steps
    if (targetStep === "STEP_1_PRIVACY") {
      if (!user.name || user.name.trim().length === 0) {
        throw {
          status: 400,
          code: "NAME_REQUIRED",
          message: "Please provide your full name before continuing to privacy pledge.",
        };
      }
      if (!session.completedSteps.includes("STEP_0_NAME")) {
        session.completedSteps.push("STEP_0_NAME");
      }
    } else if (targetStep === "STEP_2_DOCUMENT") {
      if (!session.consentGivenAt) {
        throw {
          status: 400,
          code: "CONSENT_REQUIRED",
          message: "Privacy pledge consent is required before proceeding to document upload.",
        };
      }
      if (!session.completedSteps.includes("STEP_1_PRIVACY")) {
        session.completedSteps.push("STEP_1_PRIVACY");
      }
    } else if (targetStep === "COMPLETED") {
      if (user.kycStatus !== "VERIFIED") {
        throw {
          status: 400,
          code: "KYC_VERIFICATION_REQUIRED",
          message: "Document verification must be completed before finishing onboarding.",
        };
      }
      if (!session.completedSteps.includes("STEP_2_DOCUMENT")) {
        session.completedSteps.push("STEP_2_DOCUMENT");
      }
      if (!session.completedSteps.includes("COMPLETED")) {
        session.completedSteps.push("COMPLETED");
      }
      session.completedAt = new Date();
      user.onboardingStatus = "COMPLETED";
      await user.save();
    }

    session.currentStep = targetStep;
    session.lastActiveAt = new Date();
    await session.save();

    return {
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      consentGiven: Boolean(session.consentGivenAt),
      kycStatus: user.kycStatus,
      completed: session.currentStep === "COMPLETED",
    };
  }

  /**
   * Records privacy pledge acceptance and creates an immutable audit log.
   */
  async recordConsent(
    userId: string,
    pledgeAccepted: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (pledgeAccepted !== true) {
      throw {
        status: 400,
        code: "INVALID_CONSENT",
        message: "Privacy pledge must be accepted to proceed.",
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, code: "USER_NOT_FOUND", message: "User account not found." };
    }

    let session = await OnboardingSession.findOne({ userId });
    if (!session) {
      session = await OnboardingSession.create({
        userId,
        currentStep: "STEP_1_PRIVACY",
        completedSteps: ["STEP_0_NAME"],
      });
    }

    const now = new Date();
    session.consentGivenAt = now;
    session.lastActiveAt = now;
    session.currentStep = "STEP_2_DOCUMENT";

    if (!session.completedSteps.includes("STEP_0_NAME")) {
      session.completedSteps.push("STEP_0_NAME");
    }
    if (!session.completedSteps.includes("STEP_1_PRIVACY")) {
      session.completedSteps.push("STEP_1_PRIVACY");
    }

    await session.save();

    // Create immutable audit log entry
    await AuditLog.create({
      userId,
      event: "PRIVACY_CONSENT_ACCEPTED",
      metadata: {
        source: "onboarding_privacy_pledge",
        consentTimestamp: now.toISOString(),
      },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: now,
    });

    return {
      success: true,
      currentStep: session.currentStep,
      consentGivenAt: session.consentGivenAt,
    };
  }
}

export const onboardingService = new OnboardingService();
