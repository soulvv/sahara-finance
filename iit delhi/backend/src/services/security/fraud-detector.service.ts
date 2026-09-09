/**
 * Fraud / Scam Detector Service (Phase 4)
 * Analyzes SMS, WhatsApp messages, and text for scam indicators.
 */

export interface FraudAnalysisResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  threats: { type: string; detected: boolean; description: string }[];
  recommendation: string;
}

const THREAT_PATTERNS: { type: string; patterns: RegExp[]; description: string }[] = [
  {
    type: "URGENCY",
    patterns: [/urgent/i, /immediately/i, /turant/i, /abhi/i, /within.*hour/i, /jaldi/i, /tonight/i, /block.*account/i, /suspend/i, /disconnect/i],
    description: "Creates false urgency to pressure quick action.",
  },
  {
    type: "OTP_PHISHING",
    patterns: [/share.*otp/i, /send.*otp/i, /otp.*bhejo/i, /otp.*share/i, /otp.*batao/i, /pin.*share/i, /upi.*pin/i, /cvv/i],
    description: "Attempts to steal OTP, UPI PIN, or CVV.",
  },
  {
    type: "IMPERSONATION",
    patterns: [/bank.*manager/i, /rbi/i, /sbi/i, /reserve.*bank/i, /government/i, /police/i, /income.*tax/i, /npci/i, /customer.*care/i],
    description: "Impersonates a bank, government, or authority.",
  },
  {
    type: "SUSPICIOUS_LINK",
    patterns: [/bit\.ly/i, /tinyurl/i, /click.*here/i, /\.apk/i, /download.*app/i, /verify.*link/i, /http[s]?:\/\/[^\s]+/i],
    description: "Contains suspicious or unofficial links.",
  },
  {
    type: "KYC_FRAUD",
    patterns: [/kyc/i, /aadhaar.*verify/i, /pan.*update/i, /document.*update/i, /biometric.*update/i],
    description: "Fake KYC/document update request.",
  },
  {
    type: "MONEY_REQUEST",
    patterns: [/send.*money/i, /transfer.*amount/i, /pay.*fine/i, /deposit.*amount/i, /refund.*process/i, /cashback/i, /lottery/i, /prize/i, /won/i],
    description: "Unsolicited money request or fake reward.",
  },
];

export class FraudDetectorService {
  public static analyze(text: string): FraudAnalysisResult {
    const threats = THREAT_PATTERNS.map((threat) => {
      const detected = threat.patterns.some((p) => p.test(text));
      return {
        type: threat.type,
        detected,
        description: threat.description,
      };
    });

    const detectedCount = threats.filter((t) => t.detected).length;
    const riskScore = Math.min(100, detectedCount * 20 + (detectedCount > 0 ? 10 : 0));

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (riskScore >= 60) riskLevel = "HIGH";
    else if (riskScore >= 30) riskLevel = "MEDIUM";

    let recommendation: string;
    if (riskLevel === "HIGH") {
      recommendation = "This message is very likely a scam. Do NOT click any links, share OTP/PIN, or send money. Report to cybercrime.gov.in";
    } else if (riskLevel === "MEDIUM") {
      recommendation = "This message appears potentially suspicious. Verify independently with your bank before taking action.";
    } else {
      recommendation = "No significant scam indicators detected. Stay cautious with any unexpected financial messages.";
    }

    return { riskLevel, riskScore, threats, recommendation };
  }
}
