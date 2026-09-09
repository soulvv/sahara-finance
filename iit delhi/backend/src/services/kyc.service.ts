import crypto from "crypto";
import { User } from "../models/User";
import { OnboardingSession } from "../models/OnboardingSession";
import { KycRecord } from "../models/KycRecord";
import { AuditLog } from "../models/AuditLog";
import { DocumentType } from "../types/kyc";

export class KycService {
  /**
   * Generates a realistic masked document number for demo purposes.
   */
  private generateMaskedNumber(docType: DocumentType): string {
    const random4 = Math.floor(1000 + Math.random() * 9000).toString();
    switch (docType) {
      case "AADHAAR":
        return `XXXX-XXXX-${random4}`;
      case "PAN":
        return `XXXXX${random4}P`;
      case "VOTER_ID":
        const random3 = Math.floor(100 + Math.random() * 900).toString();
        return `XXX${random3}${random4}`;
      default:
        return `XXXX-XXXX-${random4}`;
    }
  }

  /**
   * Performs in-memory demo document verification and updates user KYC state.
   */
  async verifyDocument(
    userId: string,
    documentType: string,
    fileBuffer?: Buffer,
    fileName?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const validDocTypes: DocumentType[] = ["AADHAAR", "VOTER_ID", "PAN"];
    const normalizedType = documentType?.toUpperCase() as DocumentType;

    if (!validDocTypes.includes(normalizedType)) {
      throw {
        status: 400,
        code: "INVALID_DOCUMENT_TYPE",
        message: "Invalid document type. Allowed types are AADHAAR, VOTER_ID, and PAN.",
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, code: "USER_NOT_FOUND", message: "User account not found." };
    }

    // Check if already verified
    if (user.kycStatus === "VERIFIED") {
      const existingRecord = await KycRecord.findOne({ userId }).sort({ createdAt: -1 });
      return {
        success: true,
        kycStatus: "VERIFIED",
        documentType: existingRecord?.documentType || normalizedType,
        verifiedName: existingRecord?.verifiedName || user.name || "Verified User",
        maskedNumber: existingRecord?.documentNumberMasked || this.generateMaskedNumber(normalizedType),
        verifiedAt: existingRecord?.verifiedAt || user.updatedAt,
        alreadyVerified: true,
        disclaimer: "Demo KYC verification already active.",
      };
    }

    // Retrieve or initialize session
    let session = await OnboardingSession.findOne({ userId });
    if (!session) {
      session = await OnboardingSession.create({
        userId,
        currentStep: "STEP_2_DOCUMENT",
        completedSteps: ["STEP_0_NAME", "STEP_1_PRIVACY"],
        consentGivenAt: new Date(),
      });
    }

    const verifiedName = user.name && user.name.trim().length > 0 ? user.name.trim() : "Demo User";
    const maskedNumber = this.generateMaskedNumber(normalizedType);
    const now = new Date();

    // 1. Create KYC record
    const kycRecord = await KycRecord.create({
      userId,
      documentType: normalizedType,
      documentNumberMasked: maskedNumber,
      verifiedName,
      verificationStatus: "VERIFIED",
      verifiedAt: now,
    });

    // 2. Update user state
    user.kycStatus = "VERIFIED";
    user.onboardingStatus = "COMPLETED";
    await user.save();

    // 3. Update onboarding session state
    session.currentStep = "COMPLETED";
    session.completedAt = now;
    session.lastActiveAt = now;
    if (!session.completedSteps.includes("STEP_0_NAME")) session.completedSteps.push("STEP_0_NAME");
    if (!session.completedSteps.includes("STEP_1_PRIVACY")) session.completedSteps.push("STEP_1_PRIVACY");
    if (!session.completedSteps.includes("STEP_2_DOCUMENT")) session.completedSteps.push("STEP_2_DOCUMENT");
    if (!session.completedSteps.includes("COMPLETED")) session.completedSteps.push("COMPLETED");
    await session.save();

    // 4. Create immutable audit log entry
    await AuditLog.create({
      userId,
      event: "DEMO_KYC_DOCUMENT_VERIFIED",
      metadata: {
        documentType: normalizedType,
        documentNumberMasked: maskedNumber,
        verifiedName,
        fileName: fileName || "camera_capture.jpg",
        simulatedOcr: true,
      },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: now,
    });

    return {
      success: true,
      kycStatus: "VERIFIED",
      documentType: normalizedType,
      verifiedName,
      maskedNumber,
      verifiedAt: now,
      disclaimer:
        "Demo KYC verification completed for hackathon prototype. No real government or UIDAI databases were queried.",
    };
  }
}

export const kycService = new KycService();
