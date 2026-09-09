/**
 * Comprehensive Automated Test Suite for Sahara Finance — Phase 3
 * (User Profile, Onboarding Persistence, Audit Logging, and Demo KYC)
 */

const BASE_URL = "http://localhost:5000";

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function assert(
  step: number,
  name: string,
  condition: boolean,
  errorMessage: string
) {
  if (condition) {
    console.log(`✓ Step ${step}: ${name}`);
    results.push({ step, name, passed: true });
  } else {
    console.error(`✗ Step ${step}: ${name} — FAILED: ${errorMessage}`);
    results.push({ step, name, passed: false, error: errorMessage });
  }
}

async function request(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    isMultipart?: boolean;
  } = {}
) {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  let body = options.body;
  if (body && !options.isMultipart && typeof body === "object") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const contentType = response.headers.get("content-type");
  let data: any = null;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data };
}

async function runPhase3Tests() {
  console.log("=== SAHARA FINANCE PHASE 3 TEST SUITE ===");
  console.log("Testing Profile Updates, Onboarding State Machine, Consent & Demo KYC...\n");

  // 1. Health check
  const healthRes = await request("/api/health");
  await assert(
    1,
    "GET /api/health",
    healthRes.status === 200 && healthRes.data.success === true,
    `Status ${healthRes.status}, data: ${JSON.stringify(healthRes.data)}`
  );

  // 2. Unauthenticated access protection
  const unauthMe = await request("/api/users/me", { method: "PATCH", body: { name: "Hacker" } });
  const unauthOnb = await request("/api/onboarding");
  const unauthConsent = await request("/api/onboarding/consent", { method: "POST", body: { pledgeAccepted: true } });
  const unauthKyc = await request("/api/kyc/verify-document", { method: "POST", body: { documentType: "AADHAAR" } });

  await assert(
    2,
    "All Phase 3 endpoints reject unauthenticated requests (401)",
    unauthMe.status === 401 &&
      unauthOnb.status === 401 &&
      unauthConsent.status === 401 &&
      unauthKyc.status === 401,
    `Statuses: me=${unauthMe.status}, onb=${unauthOnb.status}, consent=${unauthConsent.status}, kyc=${unauthKyc.status}`
  );

  // 3. Returning user login & onboarding status check
  const returnPhone = "+919876543210";
  let sendReturnOtp = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: returnPhone },
  });
  if (sendReturnOtp.status === 429) {
    // Wait briefly or use fallback demo token
    await new Promise((r) => setTimeout(r, 1000));
    sendReturnOtp = await request("/api/auth/send-otp", {
      method: "POST",
      body: { phone: "+919876543211" },
    });
  }
  const actualPhone = sendReturnOtp.data?.phone || returnPhone;
  const returnOtp = sendReturnOtp.data?.demoOtp || "123456";
  const returnReqId = sendReturnOtp.data?.requestId || "mock_req";

  const verifyReturn = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: actualPhone, otp: returnOtp, requestId: returnReqId },
  });
  const returnToken = verifyReturn.data?.token;

  const returnOnboarding = await request("/api/onboarding", { token: returnToken });
  await assert(
    3,
    "Returning user has COMPLETED onboarding state",
    returnOnboarding.status === 200 &&
      returnOnboarding.data.onboarding.currentStep === "COMPLETED" &&
      returnOnboarding.data.onboarding.completed === true &&
      returnOnboarding.data.onboarding.kycStatus === "VERIFIED",
    `Data: ${JSON.stringify(returnOnboarding.data)}`
  );

  // 4. Register a fresh new user
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const newPhone = `+9198${randomSuffix.toString().slice(0, 8)}`;

  const sendNewOtp = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: newPhone },
  });
  const newOtp = sendNewOtp.data.demoOtp;
  const newReqId = sendNewOtp.data.requestId;

  const verifyNew = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: newPhone, otp: newOtp, requestId: newReqId },
  });
  const newToken = verifyNew.data.token;

  await assert(
    4,
    "New user registered and authenticated",
    verifyNew.status === 200 &&
      verifyNew.data.user.onboardingStatus === "IN_PROGRESS" &&
      verifyNew.data.nextRoute === "/onboarding",
    `User: ${JSON.stringify(verifyNew.data)}`
  );

  // 5. Initial onboarding state for new user
  const initialOnboarding = await request("/api/onboarding", { token: newToken });
  await assert(
    5,
    "New user starts at STEP_0_NAME with completed=false",
    initialOnboarding.status === 200 &&
      initialOnboarding.data.onboarding.currentStep === "STEP_0_NAME" &&
      initialOnboarding.data.onboarding.consentGiven === false &&
      initialOnboarding.data.onboarding.completed === false,
    `Onboarding: ${JSON.stringify(initialOnboarding.data)}`
  );

  // 6. Name validation: reject empty / short name
  const invalidNameRes = await request("/api/users/me", {
    method: "PATCH",
    token: newToken,
    body: { name: "   " },
  });
  await assert(
    6,
    "PATCH /api/users/me rejects empty name with INVALID_NAME",
    invalidNameRes.status === 400 && invalidNameRes.data.code === "INVALID_NAME",
    `Status ${invalidNameRes.status}, data: ${JSON.stringify(invalidNameRes.data)}`
  );

  // 7. Name update: valid name save
  const validNameRes = await request("/api/users/me", {
    method: "PATCH",
    token: newToken,
    body: { name: "Sunita Devi" },
  });
  await assert(
    7,
    "PATCH /api/users/me saves full name successfully",
    validNameRes.status === 200 && validNameRes.data.user.name === "Sunita Devi",
    `User: ${JSON.stringify(validNameRes.data)}`
  );

  // 8. Language validation & update
  const invalidLangRes = await request("/api/users/me", {
    method: "PATCH",
    token: newToken,
    body: { preferredLanguage: "es" },
  });
  const validLangRes = await request("/api/users/me", {
    method: "PATCH",
    token: newToken,
    body: { preferredLanguage: "hi" },
  });
  await assert(
    8,
    "Preferred language validation & persistence (hi/hinglish/en)",
    invalidLangRes.status === 400 &&
      invalidLangRes.data.code === "INVALID_LANGUAGE" &&
      validLangRes.status === 200 &&
      validLangRes.data.user.preferredLanguage === "hi",
    `Lang test: invalid=${invalidLangRes.status}, valid=${validLangRes.status}`
  );

  // 9. Step progression: update progress to STEP_1_PRIVACY
  const step1Progress = await request("/api/onboarding/progress", {
    method: "PATCH",
    token: newToken,
    body: { currentStep: "STEP_1_PRIVACY" },
  });
  await assert(
    9,
    "PATCH /api/onboarding/progress advances to STEP_1_PRIVACY",
    step1Progress.status === 200 &&
      step1Progress.data.onboarding.currentStep === "STEP_1_PRIVACY" &&
      step1Progress.data.onboarding.completedSteps.includes("STEP_0_NAME"),
    `Data: ${JSON.stringify(step1Progress.data)}`
  );

  // 10. Skipping step rule: cannot jump to STEP_2_DOCUMENT without consent
  const skipConsentRes = await request("/api/onboarding/progress", {
    method: "PATCH",
    token: newToken,
    body: { currentStep: "STEP_2_DOCUMENT" },
  });
  await assert(
    10,
    "Cannot skip to STEP_2_DOCUMENT without privacy consent (CONSENT_REQUIRED)",
    skipConsentRes.status === 400 && skipConsentRes.data.code === "CONSENT_REQUIRED",
    `Status: ${skipConsentRes.status}, code: ${skipConsentRes.data.code}`
  );

  // 11. Privacy consent: reject false pledge
  const rejectConsent = await request("/api/onboarding/consent", {
    method: "POST",
    token: newToken,
    body: { pledgeAccepted: false },
  });
  await assert(
    11,
    "POST /api/onboarding/consent rejects false pledge",
    rejectConsent.status === 400 && rejectConsent.data.code === "CONSENT_REQUIRED",
    `Status: ${rejectConsent.status}`
  );

  // 12. Privacy consent: accept pledge & record audit log
  const acceptConsent = await request("/api/onboarding/consent", {
    method: "POST",
    token: newToken,
    body: { pledgeAccepted: true },
  });
  await assert(
    12,
    "POST /api/onboarding/consent accepts pledge & advances to STEP_2_DOCUMENT",
    acceptConsent.status === 200 &&
      acceptConsent.data.success === true &&
      acceptConsent.data.currentStep === "STEP_2_DOCUMENT" &&
      Boolean(acceptConsent.data.consentGivenAt),
    `Consent: ${JSON.stringify(acceptConsent.data)}`
  );

  // 13. Resume verification: GET /api/onboarding reflects STEP_2_DOCUMENT
  const resumeOnboarding = await request("/api/onboarding", { token: newToken });
  await assert(
    13,
    "GET /api/onboarding resumes correctly after consent",
    resumeOnboarding.status === 200 &&
      resumeOnboarding.data.onboarding.currentStep === "STEP_2_DOCUMENT" &&
      resumeOnboarding.data.onboarding.consentGiven === true &&
      resumeOnboarding.data.onboarding.completedSteps.includes("STEP_1_PRIVACY"),
    `Onboarding: ${JSON.stringify(resumeOnboarding.data)}`
  );

  // 14. KYC validation: reject invalid document type
  const invalidKycDoc = await request("/api/kyc/verify-document", {
    method: "POST",
    token: newToken,
    body: { documentType: "DRIVING_LICENSE" },
  });
  await assert(
    14,
    "POST /api/kyc/verify-document rejects invalid document type",
    invalidKycDoc.status === 400 &&
      invalidKycDoc.data.code === "INVALID_DOCUMENT_TYPE",
    `Status ${invalidKycDoc.status}, code: ${invalidKycDoc.data.code}`
  );

  // 15. KYC verification: verify demo document (Aadhaar)
  const validKycRes = await request("/api/kyc/verify-document", {
    method: "POST",
    token: newToken,
    body: { documentType: "AADHAAR" },
  });
  await assert(
    15,
    "POST /api/kyc/verify-document completes demo verification with masked ID",
    validKycRes.status === 200 &&
      validKycRes.data.kycStatus === "VERIFIED" &&
      validKycRes.data.documentType === "AADHAAR" &&
      validKycRes.data.verifiedName === "Sunita Devi" &&
      validKycRes.data.maskedNumber.startsWith("XXXX-XXXX-"),
    `KYC: ${JSON.stringify(validKycRes.data)}`
  );

  // 16. State verification after KYC: user and onboarding are COMPLETED
  const finalUser = await request("/api/users/me", { token: newToken });
  const finalOnboarding = await request("/api/onboarding", { token: newToken });
  await assert(
    16,
    "User profile and onboarding session transition to COMPLETED",
    finalUser.data.user.onboardingStatus === "COMPLETED" &&
      finalUser.data.user.kycStatus === "VERIFIED" &&
      finalOnboarding.data.onboarding.currentStep === "COMPLETED" &&
      finalOnboarding.data.onboarding.completed === true,
    `Final user: ${JSON.stringify(finalUser.data)}, Final onb: ${JSON.stringify(finalOnboarding.data)}`
  );

  // 17. Duplicate KYC verification handled gracefully
  const dupKycRes = await request("/api/kyc/verify-document", {
    method: "POST",
    token: newToken,
    body: { documentType: "AADHAAR" },
  });
  await assert(
    17,
    "Duplicate KYC request returns verified state without error",
    dupKycRes.status === 200 && dupKycRes.data.kycStatus === "VERIFIED",
    `Duplicate KYC: ${JSON.stringify(dupKycRes.data)}`
  );

  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  if (passed === total) {
    console.log(">>> ALL 17 PHASE 3 TESTS PASSED PERFECTLY! <<<");
  } else {
    console.error(">>> SOME TESTS FAILED <<<");
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
