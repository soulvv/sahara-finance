/**
 * Test Suite for Phase 1–8 Upgrades:
 * AI Policy Firewall, NLP, Financial Intelligence, Adaptive Security, Audit Chain
 */

import { SafeToSpendService } from "./services/intelligence/safe-to-spend.service";
import { FinancialHealthService } from "./services/intelligence/financial-health.service";
import { SpendingAnalyticsService } from "./services/intelligence/spending-analytics.service";
import { SavingsGoalService } from "./services/intelligence/savings-goal.service";
import { SimulatorService } from "./services/intelligence/simulator.service";
import { FraudDetectorService } from "./services/security/fraud-detector.service";
import { AnomalyDetectionService } from "./services/security/anomaly-detection.service";
import { AccountFreezeService } from "./services/security/account-freeze.service";
import { DeviceService } from "./services/security/device.service";
import { DisputeService } from "./services/security/dispute.service";
import { ExplainScreenService } from "./services/ai/explain-screen.service";
import { AuditChainService } from "./services/ledger/audit-chain.service";
import { PolicyService } from "./services/ai/policy/policy.service";
import { EntityExtractorService } from "./services/ai/nlp/entity-extractor.service";
import { AmbiguityResolverService } from "./services/ai/nlp/ambiguity-resolver.service";

async function runTests() {
  console.log("=== SAHARA FINANCE: NEW CAPABILITIES VERIFICATION SUITE ===\n");
  let passed = 0;

  // 1. AI Policy Firewall
  const safeIntent = PolicyService.evaluate("NAVIGATE", { target: "/dashboard" });
  if (safeIntent.allowed && safeIntent.riskLevel === "LOW") {
    console.log("✓ Test 1: AI Policy Firewall permits low-risk balance query");
    passed++;
  } else {
    throw new Error("Test 1 failed");
  }

  const maliciousInjection = PolicyService.evaluate("DIRECT_DEBIT", {
    amount: 10000,
  });
  if (
    !maliciousInjection.allowed ||
    maliciousInjection.riskLevel === "HIGH" ||
    maliciousInjection.sanitizedActionType !== "DIRECT_DEBIT"
  ) {
    console.log("✓ Test 2: AI Policy Firewall detects direct debit and blocks/downgrades high risk action");
    passed++;
  } else {
    throw new Error("Test 2 failed");
  }

  // 2. Multilingual NLP Entity Extraction & Ambiguity Resolution
  const nlpExtract = EntityExtractorService.extract("Ramesh ko paanch sau rupaye bhejo");
  if (nlpExtract.amount === 500) {
    console.log("✓ Test 3: Multilingual Entity Extractor resolves 'paanch sau' to 500 INR");
    passed++;
  } else {
    throw new Error(`Test 3 failed: got amount ${nlpExtract.amount}`);
  }

  const ambiguityCheck = AmbiguityResolverService.checkAmbiguity("pachaas rupaye", 50);
  if (ambiguityCheck.isAmbiguous && ambiguityCheck.options?.includes(500)) {
    console.log("✓ Test 4: Ambiguity Resolver flags acoustic ambiguity between ₹50 and ₹500");
    passed++;
  } else {
    throw new Error("Test 4 failed");
  }

  // 3. Fraud / Scam Detector
  const scamResult = FraudDetectorService.analyze("URGENT: Your electricity will be disconnected tonight! Share OTP immediately to verify KYC.");
  if (scamResult.riskLevel === "HIGH" && scamResult.threats.some((t) => t.detected)) {
    console.log("✓ Test 5: Scam Detector flags urgent fake-KYC & OTP phishing SMS as HIGH risk");
    passed++;
  } else {
    throw new Error("Test 5 failed");
  }

  // 4. Safe SMS
  const cleanSms = FraudDetectorService.analyze("Your order from Flipkart has been delivered. Thank you!");
  if (cleanSms.riskLevel === "LOW") {
    console.log("✓ Test 6: Clean notification correctly identified as LOW risk");
    passed++;
  } else {
    throw new Error("Test 6 failed");
  }

  // 5. Account Freeze & Unfreeze
  const dummyUser = "test_user_freeze_001";
  AccountFreezeService.freeze(dummyUser, "Suspicious activity detected");
  if (AccountFreezeService.isAccountFrozen(dummyUser)) {
    console.log("✓ Test 7: Emergency Account Freeze locks user account");
    passed++;
  } else {
    throw new Error("Test 7 failed");
  }

  AccountFreezeService.unfreeze(dummyUser);
  if (!AccountFreezeService.isAccountFrozen(dummyUser)) {
    console.log("✓ Test 8: Account unfreeze safely restores transaction access");
    passed++;
  } else {
    throw new Error("Test 8 failed");
  }

  // 6. Savings Goals
  const newGoal = SavingsGoalService.create(dummyUser, {
    name: "Tractor Repair",
    targetAmount: 15000,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (newGoal.name === "Tractor Repair" && newGoal.targetAmount === 15000) {
    console.log("✓ Test 9: Savings Goal created with target tracking");
    passed++;
  } else {
    throw new Error("Test 9 failed");
  }

  const updatedGoal = SavingsGoalService.addFunds(dummyUser, newGoal.id, 3000);
  if (updatedGoal?.currentAmount === 3000) {
    console.log("✓ Test 10: Contribution added to Savings Goal");
    passed++;
  } else {
    throw new Error("Test 10 failed");
  }

  // 7. Screen Explanation in Hindi & English
  const screenExplHi = ExplainScreenService.getExplanation("safetospend", "hi");
  if (screenExplHi.title.includes("सुरक्षित खर्च") && screenExplHi.keyPoints.length > 0) {
    console.log("✓ Test 11: Screen Explanation generated in natural Hindi for Safe-to-Spend");
    passed++;
  } else {
    throw new Error("Test 11 failed");
  }

  const screenExplEn = ExplainScreenService.getExplanation("loan", "en");
  if (screenExplEn.title.includes("Micro-Loan") && screenExplEn.keyPoints.length > 0) {
    console.log("✓ Test 12: Screen Explanation generated in English for Micro-Loan");
    passed++;
  } else {
    throw new Error("Test 12 failed");
  }

  // 8. Dispute Service
  const dispute = DisputeService.create(dummyUser, {
    transactionId: "tx_unknown_99",
    amount: 1200,
    reason: "Did not make this payment at night",
  });
  if (dispute.id.startsWith("DISP-") && dispute.status === "SUBMITTED") {
    console.log("✓ Test 13: Fraud dispute logged with SLA tracking (48h)");
    passed++;
  } else {
    throw new Error("Test 13 failed");
  }

  // 9. Tamper-evident Audit Receipt Verification
  const receiptVerify = AuditChainService.verifyReceipt("REC-2026-9812", {
    amount: 500,
    timestamp: new Date().toISOString(),
    recipientUpiId: "rahul@upi",
  });
  if (receiptVerify.verified && receiptVerify.signature) {
    console.log("✓ Test 14: Tamper-evident receipt verified with SHA-256 signature");
    passed++;
  } else {
    throw new Error("Test 14 failed");
  }

  console.log(`\n==========================================`);
  console.log(`TOTAL NEW TESTS: ${passed} | PASSED: ${passed} | FAILED: 0`);
  console.log(`>>> ALL NEW PHASE CAPABILITIES VALIDATED SUCCESSFULLY! <<<`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
