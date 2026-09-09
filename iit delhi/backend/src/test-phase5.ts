/**
 * Comprehensive Automated Test Suite for Sahara Finance — Phase 5
 * (Demo Payments, Internal Ledger, Atomic Deductions & Idempotency)
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
  } = {}
) {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  let body = options.body;
  if (body && typeof body === "object") {
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

async function runPhase5Tests() {
  console.log("=== SAHARA FINANCE PHASE 5 TEST SUITE ===");
  console.log("Testing Merchant Lookup, Payment Intents, Atomic Ledger, and Idempotency...\n");

  // 1. Health check
  const healthRes = await request("/api/health");
  await assert(
    1,
    "GET /api/health",
    healthRes.status === 200 && healthRes.data.success === true,
    `Status ${healthRes.status}`
  );

  // 2. Unauthenticated access protection
  const unauthMerchant = await request("/api/merchants/lookup?upiId=rahul.store@upi");
  const unauthPay = await request("/api/payments/initiate", {
    method: "POST",
    body: { recipientUpi: "rahul.store@upi", amount: 500 },
  });

  await assert(
    2,
    "Payment and Merchant endpoints reject unauthenticated requests (401)",
    unauthMerchant.status === 401 && unauthPay.status === 401,
    `Merchant: ${unauthMerchant.status}, Pay: ${unauthPay.status}`
  );

  // 3. Authenticate fresh demo user A
  const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const sendOtpA = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: phoneA },
  });
  const otpA = sendOtpA.data.demoOtp;
  const reqIdA = sendOtpA.data.requestId;

  const verifyA = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: phoneA, otp: otpA, requestId: reqIdA },
  });
  const tokenA = verifyA.data.token;

  await assert(
    3,
    "Demo User A authenticated with token",
    verifyA.status === 200 && Boolean(tokenA),
    `Data: ${JSON.stringify(verifyA.data)}`
  );

  // 4. Merchant lookup by UPI ID
  const merchantRes = await request(
    "/api/merchants/lookup?upiId=rahul.store@upi",
    { token: tokenA }
  );
  await assert(
    4,
    "GET /api/merchants/lookup resolves 'Rahul General Store'",
    merchantRes.status === 200 &&
      merchantRes.data.success === true &&
      merchantRes.data.merchant.name === "Rahul General Store" &&
      merchantRes.data.merchant.upiId === "rahul.store@upi",
    `Merchant data: ${JSON.stringify(merchantRes.data)}`
  );

  // 5. Amount validation: reject 0 and negative
  const invalidAmtZero = await request("/api/payments/initiate", {
    method: "POST",
    token: tokenA,
    body: { recipientUpi: "rahul.store@upi", amount: 0 },
  });
  const invalidAmtNeg = await request("/api/payments/initiate", {
    method: "POST",
    token: tokenA,
    body: { recipientUpi: "rahul.store@upi", amount: -50 },
  });

  await assert(
    5,
    "POST /api/payments/initiate rejects 0 and negative amounts with INVALID_AMOUNT (400)",
    invalidAmtZero.status === 400 &&
      invalidAmtZero.data.code === "INVALID_AMOUNT" &&
      invalidAmtNeg.status === 400 &&
      invalidAmtNeg.data.code === "INVALID_AMOUNT",
    `Zero status: ${invalidAmtZero.status}, Neg status: ${invalidAmtNeg.status}`
  );

  // 6. Insufficient balance prevention
  const excessivePay = await request("/api/payments/initiate", {
    method: "POST",
    token: tokenA,
    body: { recipientUpi: "rahul.store@upi", amount: 49999 }, // user has 8420
  });

  await assert(
    6,
    "POST /api/payments/initiate rejects payment exceeding balance with INSUFFICIENT_BALANCE (422)",
    excessivePay.status === 422 &&
      excessivePay.data.code === "INSUFFICIENT_BALANCE" &&
      typeof excessivePay.data.availableBalance === "number",
    `Status ${excessivePay.status}, code: ${excessivePay.data?.code}`
  );

  // 7. Successful payment initiation
  const initRes = await request("/api/payments/initiate", {
    method: "POST",
    token: tokenA,
    body: { recipientUpi: "rahul.store@upi", amount: 500 },
  });

  const paymentId = initRes.data?.payment?.paymentId;
  await assert(
    7,
    "POST /api/payments/initiate creates payment intent for ₹500",
    initRes.status === 201 &&
      initRes.data.success === true &&
      Boolean(paymentId) &&
      initRes.data.payment.amount === 500 &&
      initRes.data.payment.status === "INITIATED",
    `Init response: ${JSON.stringify(initRes.data)}`
  );

  // 8. Payment intent details for confirmation screen
  const detailsRes = await request(`/api/payments/${paymentId}`, {
    token: tokenA,
  });

  await assert(
    8,
    "GET /api/payments/:id returns review information with current and estimated balance",
    detailsRes.status === 200 &&
      detailsRes.data.success === true &&
      detailsRes.data.payment.amount === 500 &&
      detailsRes.data.payment.merchant.name === "Rahul General Store" &&
      typeof detailsRes.data.payment.accountBalance === "number" &&
      typeof detailsRes.data.payment.estimatedRemainingBalance === "number",
    `Details: ${JSON.stringify(detailsRes.data)}`
  );

  // Fetch initial balance before execution
  const preBalRes = await request("/api/account/balance", { token: tokenA });
  const preBalance = preBalRes.data.account.balance;

  // 9. Payment Execution with Idempotency Key
  const idempotencyKey1 = "idemp-test-uuid-" + Date.now();
  const execRes = await request("/api/payments/execute", {
    method: "POST",
    token: tokenA,
    body: { paymentId, idempotencyKey: idempotencyKey1 },
  });

  await assert(
    9,
    "POST /api/payments/execute executes payment and creates transaction",
    execRes.status === 200 &&
      execRes.data.success === true &&
      execRes.data.duplicate === false &&
      execRes.data.payment.status === "COMPLETED" &&
      Boolean(execRes.data.payment.referenceId) &&
      Boolean(execRes.data.payment.transactionId),
    `Exec response: ${JSON.stringify(execRes.data)}`
  );

  // 10. Atomic Balance Verification: balance must decrease by exactly ₹500
  const postBalRes = await request("/api/account/balance", { token: tokenA });
  const postBalance = postBalRes.data.account.balance;

  await assert(
    10,
    "Account balance decremented atomically by ₹500 in MongoDB ledger",
    postBalance === preBalance - 500,
    `Pre-balance: ${preBalance}, Post-balance: ${postBalance}`
  );

  // 11. Idempotency Test: Repeat exact execution request
  const repeatExecRes = await request("/api/payments/execute", {
    method: "POST",
    token: tokenA,
    body: { paymentId, idempotencyKey: idempotencyKey1 },
  });

  const repeatBalRes = await request("/api/account/balance", { token: tokenA });
  const repeatBalance = repeatBalRes.data.account.balance;

  await assert(
    11,
    "Repeat execution with same idempotencyKey returns duplicate: true without double-debiting",
    repeatExecRes.status === 200 &&
      repeatExecRes.data.duplicate === true &&
      repeatExecRes.data.payment.status === "COMPLETED" &&
      repeatBalance === postBalance,
    `Repeat exec: ${JSON.stringify(repeatExecRes.data)}, Balance: ${repeatBalance}`
  );

  // 12. Transaction history shows new debit at index 0
  const txRes = await request("/api/transactions/recent?limit=5", {
    token: tokenA,
  });
  const latestTx = txRes.data.transactions[0];

  await assert(
    12,
    "GET /api/transactions/recent displays new payment at top of recent transactions",
    txRes.status === 200 &&
      latestTx.title === "Rahul General Store" &&
      latestTx.amount === -500 &&
      latestTx.type === "DEBIT",
    `Latest tx: ${JSON.stringify(latestTx)}`
  );

  // 13. Receipt API verification
  const receiptRes = await request(`/api/payments/${paymentId}/receipt`, {
    token: tokenA,
  });

  await assert(
    13,
    "GET /api/payments/:id/receipt returns full transaction receipt and remaining balance",
    receiptRes.status === 200 &&
      receiptRes.data.success === true &&
      receiptRes.data.receipt.amount === 500 &&
      receiptRes.data.receipt.merchantName === "Rahul General Store" &&
      receiptRes.data.receipt.remainingBalance === postBalance &&
      Boolean(receiptRes.data.receipt.referenceId),
    `Receipt: ${JSON.stringify(receiptRes.data)}`
  );

  // 14. User Data Isolation: User B cannot access User A's payment intent
  const phoneB = `+9198${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const sendOtpB = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: phoneB },
  });
  const verifyB = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: phoneB, otp: sendOtpB.data.demoOtp, requestId: sendOtpB.data.requestId },
  });
  const tokenB = verifyB.data.token;

  const crossUserPayment = await request(`/api/payments/${paymentId}`, {
    token: tokenB,
  });

  await assert(
    14,
    "User B cannot access or view User A's payment intent (403 UNAUTHORIZED)",
    crossUserPayment.status === 403 && crossUserPayment.data.code === "UNAUTHORIZED",
    `Cross-user status: ${crossUserPayment.status}`
  );

  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  if (passed === total) {
    console.log(">>> ALL 14 PHASE 5 TESTS PASSED PERFECTLY! <<<");
  } else {
    console.error(">>> SOME TESTS FAILED <<<");
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
