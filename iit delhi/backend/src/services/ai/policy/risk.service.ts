/**
 * AI Action Risk Service
 * Evaluates contextual financial risk for proposed AI and user transactions.
 */

export interface RiskAssessment {
  riskScore: number; // 0 to 100
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
  recommendedAuth: "SWIPE" | "PIN" | "STEP_UP_OTP";
}

export class RiskService {
  /**
   * Assess transaction risk based on amount, recipient, and user history.
   */
  public static assessTransactionRisk(params: {
    amount: number;
    recipientUpi?: string;
    isKnownRecipient?: boolean;
    userDailySpent?: number;
    dailyLimit?: number;
    isNewDevice?: boolean;
  }): RiskAssessment {
    const {
      amount,
      isKnownRecipient = true,
      userDailySpent = 0,
      dailyLimit = 50000,
      isNewDevice = false,
    } = params;

    let score = 10;
    const factors: string[] = [];

    // Amount scoring
    if (amount > 10000) {
      score += 40;
      factors.push("Transaction amount exceeds ₹10,000 threshold");
    } else if (amount > 2000) {
      score += 20;
      factors.push("Transaction amount exceeds ₹2,000");
    }

    // Recipient novelty
    if (!isKnownRecipient) {
      score += 25;
      factors.push("First-time transaction to new recipient/UPI ID");
    }

    // Daily limit utilization
    if (userDailySpent + amount > dailyLimit * 0.8) {
      score += 20;
      factors.push("Approaching 80% of daily transaction limit");
    }

    // Device novelty
    if (isNewDevice) {
      score += 30;
      factors.push("Initiated from an unrecognized or newly added device");
    }

    // Clamp score
    const finalScore = Math.min(100, Math.max(0, score));

    let riskTier: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let recommendedAuth: "SWIPE" | "PIN" | "STEP_UP_OTP" = "SWIPE";

    if (finalScore >= 70) {
      riskTier = "HIGH";
      recommendedAuth = "STEP_UP_OTP";
    } else if (finalScore >= 35) {
      riskTier = "MEDIUM";
      recommendedAuth = "PIN";
    }

    return {
      riskScore: finalScore,
      riskTier,
      factors,
      recommendedAuth,
    };
  }
}
