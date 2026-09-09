const BASE_URL = "http://localhost:5000";

async function testSuite() {
  console.log("=== SAHARA FINANCE BACKEND AUTH TEST SUITE ===\n");

  // 1. Health Check
  console.log("1. Testing GET /api/health...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log("   Status:", healthRes.status);
  console.log("   Body:", JSON.stringify(healthData));
  if (!healthData.success) throw new Error("Health check failed");

  // 2. Invalid Phone Number
  console.log("\n2. Testing POST /api/auth/send-otp with invalid phone...");
  const invalidPhoneRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "123" }),
  });
  const invalidPhoneData = await invalidPhoneRes.json();
  console.log("   Status:", invalidPhoneRes.status);
  console.log("   Body:", JSON.stringify(invalidPhoneData));
  if (invalidPhoneRes.status !== 400 || invalidPhoneData.code !== "INVALID_PHONE_NUMBER") {
    throw new Error("Invalid phone test failed");
  }

  // 3. Valid Phone Number (Returning User)
  const returningPhone = "+919876543210";
  console.log(`\n3. Testing POST /api/auth/send-otp with returning phone ${returningPhone}...`);
  const sendOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: returningPhone }),
  });
  const sendOtpData = await sendOtpRes.json();
  console.log("   Status:", sendOtpRes.status);
  console.log("   Body:", JSON.stringify(sendOtpData));
  if (!sendOtpData.success || !sendOtpData.demoOtp || !sendOtpData.requestId) {
    throw new Error("Send OTP test failed");
  }

  const { demoOtp, requestId } = sendOtpData;

  // 4. Rate Limiting / Resend Cooldown
  console.log("\n4. Testing OTP Resend Cooldown (Immediate re-request)...");
  const immediateRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: returningPhone }),
  });
  const immediateData = await immediateRes.json();
  console.log("   Status:", immediateRes.status);
  console.log("   Body:", JSON.stringify(immediateData));
  if (immediateRes.status !== 429 || immediateData.code !== "OTP_RESEND_TOO_SOON") {
    throw new Error("Resend cooldown test failed");
  }

  // 5. Verify Incorrect OTP
  console.log("\n5. Testing POST /api/auth/verify-otp with incorrect code...");
  const wrongOtpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: returningPhone,
      otp: "000000",
      requestId,
    }),
  });
  const wrongOtpData = await wrongOtpRes.json();
  console.log("   Status:", wrongOtpRes.status);
  console.log("   Body:", JSON.stringify(wrongOtpData));
  if (wrongOtpRes.status !== 400 || wrongOtpData.code !== "INVALID_OTP" || wrongOtpData.attemptsRemaining !== 2) {
    throw new Error("Incorrect OTP attempt test failed");
  }

  // 6. Verify Correct OTP (Returning User -> /dashboard)
  console.log(`\n6. Testing POST /api/auth/verify-otp with correct demo OTP (${demoOtp})...`);
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: returningPhone,
      otp: demoOtp,
      requestId,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log("   Status:", verifyRes.status);
  console.log("   Body:", JSON.stringify(verifyData));
  if (!verifyData.success || !verifyData.token || verifyData.nextRoute !== "/dashboard") {
    throw new Error("Verify OTP for returning user failed");
  }

  const token = verifyData.token;

  // 7. Verify Re-use of same OTP is Rejected
  console.log("\n7. Testing OTP Replay (verifying already used OTP)...");
  const replayRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: returningPhone,
      otp: demoOtp,
      requestId,
    }),
  });
  const replayData = await replayRes.json();
  console.log("   Status:", replayRes.status);
  console.log("   Body:", JSON.stringify(replayData));
  if (replayRes.status !== 400 || replayData.code !== "OTP_ALREADY_USED") {
    throw new Error("OTP Replay prevention test failed");
  }

  // 8. Authenticated GET /api/users/me
  console.log("\n8. Testing authenticated GET /api/users/me...");
  const meRes = await fetch(`${BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log("   Status:", meRes.status);
  console.log("   Body:", JSON.stringify(meData));
  if (!meData.success || meData.user.phone !== returningPhone) {
    throw new Error("Get current user test failed");
  }

  // 9. Unauthenticated GET /api/users/me
  console.log("\n9. Testing unauthenticated GET /api/users/me...");
  const unauthRes = await fetch(`${BASE_URL}/api/users/me`);
  const unauthData = await unauthRes.json();
  console.log("   Status:", unauthRes.status);
  console.log("   Body:", JSON.stringify(unauthData));
  if (unauthRes.status !== 401 || unauthData.code !== "UNAUTHORIZED") {
    throw new Error("Unauthenticated check failed");
  }

  // 10. New User Registration Flow (Phone -> /onboarding)
  const newPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`\n10. Testing brand new user registration with ${newPhone}...`);
  const newOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: newPhone }),
  });
  const newOtpData = await newOtpRes.json();
  console.log("    Send OTP Status:", newOtpRes.status, "Demo OTP:", newOtpData.demoOtp);

  const newVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: newPhone,
      otp: newOtpData.demoOtp,
      requestId: newOtpData.requestId,
    }),
  });
  const newVerifyData = await newVerifyRes.json();
  console.log("    Verify Status:", newVerifyRes.status);
  console.log("    Next Route:", newVerifyData.nextRoute, "Onboarding Status:", newVerifyData.user.onboardingStatus);
  if (!newVerifyData.success || newVerifyData.nextRoute !== "/onboarding" || newVerifyData.user.onboardingStatus !== "IN_PROGRESS") {
    throw new Error("New user onboarding routing test failed");
  }

  // 11. Logout
  console.log("\n11. Testing POST /api/auth/logout...");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const logoutData = await logoutRes.json();
  console.log("    Status:", logoutRes.status);
  console.log("    Body:", JSON.stringify(logoutData));
  if (!logoutData.success) {
    throw new Error("Logout test failed");
  }

  console.log("\n>>> ALL 11 BACKEND AUTHENTICATION TESTS PASSED PERFECTLY! <<<");
}

testSuite().catch((err) => {
  console.error("\n[TEST FAILURE]:", err);
  process.exit(1);
});
