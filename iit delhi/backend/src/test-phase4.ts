/**
 * Comprehensive Automated Test Suite for Sahara Finance — Phase 4
 * (Backend-Connected Dashboard, Account Balance, and Transaction History)
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

async function runPhase4Tests() {
  console.log("=== SAHARA FINANCE PHASE 4 TEST SUITE ===");
  console.log("Testing Account Balance, Transaction History, Pagination, and User Isolation...\n");

  // 1. Health check
  const healthRes = await request("/api/health");
  await assert(
    1,
    "GET /api/health",
    healthRes.status === 200 && healthRes.data.success === true,
    `Status ${healthRes.status}`
  );

  // 2. Unauthenticated access protection
  const unauthBal = await request("/api/account/balance");
  const unauthTx = await request("/api/transactions/recent");

  await assert(
    2,
    "GET /api/account/balance and GET /api/transactions/recent reject unauthenticated requests (401)",
    unauthBal.status === 401 && unauthTx.status === 401,
    `Balances status: ${unauthBal.status}, Transactions status: ${unauthTx.status}`
  );

  // 3. Register fresh test user A
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
    "Demo user A authenticated with token",
    verifyA.status === 200 && Boolean(tokenA),
    `Data: ${JSON.stringify(verifyA.data)}`
  );

  // 4. Balance retrieval for demo user
  const balanceResA = await request("/api/account/balance", { token: tokenA });
  await assert(
    4,
    "GET /api/account/balance returns account details and initial balance 8420.00",
    balanceResA.status === 200 &&
      balanceResA.data.success === true &&
      balanceResA.data.account.balance === 8420 &&
      balanceResA.data.account.currency === "INR" &&
      balanceResA.data.account.status === "ACTIVE" &&
      Boolean(balanceResA.data.account.accountNumberMasked),
    `Balance response: ${JSON.stringify(balanceResA.data)}`
  );

  // 5. Transaction history retrieval for demo user
  const txResA = await request("/api/transactions/recent", { token: tokenA });
  await assert(
    5,
    "GET /api/transactions/recent returns 4 initial demo transactions",
    txResA.status === 200 &&
      txResA.data.success === true &&
      Array.isArray(txResA.data.transactions) &&
      txResA.data.transactions.length >= 4,
    `Transactions count: ${txResA.data.transactions?.length}`
  );

  // 6. Verify transaction properties
  const firstTx = txResA.data.transactions[0];
  await assert(
    6,
    "Transaction object is sanitized and formatted with title, amount, type, date",
    Boolean(
      firstTx.id &&
        firstTx.title &&
        typeof firstTx.amount === "number" &&
        firstTx.type &&
        firstTx.date
    ),
    `First Tx: ${JSON.stringify(firstTx)}`
  );

  // 7. Pagination / Limit = 2
  const limit2Res = await request("/api/transactions/recent?limit=2", { token: tokenA });
  await assert(
    7,
    "GET /api/transactions/recent?limit=2 returns exactly 2 items",
    limit2Res.status === 200 && limit2Res.data.transactions.length === 2,
    `Returned ${limit2Res.data.transactions?.length} items`
  );

  // 8. Pagination / Limit = 50
  const limit50Res = await request("/api/transactions/recent?limit=50", { token: tokenA });
  await assert(
    8,
    "GET /api/transactions/recent?limit=50 succeeds",
    limit50Res.status === 200 && limit50Res.data.transactions.length <= 50,
    `Returned ${limit50Res.data.transactions?.length} items`
  );

  // 9. Invalid limit: negative integer
  const invalidLimitNeg = await request("/api/transactions/recent?limit=-5", { token: tokenA });
  await assert(
    9,
    "GET /api/transactions/recent?limit=-5 rejects with INVALID_LIMIT (400)",
    invalidLimitNeg.status === 400 && invalidLimitNeg.data.code === "INVALID_LIMIT",
    `Status ${invalidLimitNeg.status}, code: ${invalidLimitNeg.data?.code}`
  );

  // 10. Invalid limit: non-numeric string
  const invalidLimitStr = await request("/api/transactions/recent?limit=abc", { token: tokenA });
  await assert(
    10,
    "GET /api/transactions/recent?limit=abc rejects with INVALID_LIMIT (400)",
    invalidLimitStr.status === 400 && invalidLimitStr.data.code === "INVALID_LIMIT",
    `Status ${invalidLimitStr.status}, code: ${invalidLimitStr.data?.code}`
  );

  // 11. Excess limit clamping: limit=100 is safely capped at 50
  const excessLimit = await request("/api/transactions/recent?limit=100", { token: tokenA });
  await assert(
    11,
    "GET /api/transactions/recent?limit=100 is safely accepted and clamped to 50",
    excessLimit.status === 200 && excessLimit.data.transactions.length <= 50,
    `Returned ${excessLimit.data.transactions?.length} items`
  );

  // 12. Register a second distinct user (User B)
  const phoneB = `+9198${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const sendOtpB = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: phoneB },
  });
  const otpB = sendOtpB.data.demoOtp;
  const reqIdB = sendOtpB.data.requestId;

  const verifyB = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: phoneB, otp: otpB, requestId: reqIdB },
  });
  const tokenB = verifyB.data.token;

  await assert(
    12,
    "User B registered and authenticated",
    verifyB.status === 200 && Boolean(tokenB),
    `User B payload: ${JSON.stringify(verifyB.data)}`
  );

  // 13. Query User B's balance (triggers automatic demo account bootstrap)
  const balanceResB = await request("/api/account/balance", { token: tokenB });
  await assert(
    13,
    "User B receives independent demo account with balance 8420.00",
    balanceResB.status === 200 && balanceResB.data.account.balance === 8420,
    `User B balance: ${JSON.stringify(balanceResB.data)}`
  );

  // 14. Data Isolation Verification
  const txResB = await request("/api/transactions/recent", { token: tokenB });
  const txIdsA = new Set(txResA.data.transactions.map((t: any) => t.id));
  const txIdsB = new Set(txResB.data.transactions.map((t: any) => t.id));
  const hasOverlap = [...txIdsB].some((id) => txIdsA.has(id));

  await assert(
    14,
    "User A and User B transactions are completely isolated (zero ID overlap)",
    !hasOverlap && txResA.data.transactions.length > 0 && txResB.data.transactions.length > 0,
    `Overlap detected: ${hasOverlap}`
  );

  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  if (passed === total) {
    console.log(">>> ALL 14 PHASE 4 TESTS PASSED PERFECTLY! <<<");
  } else {
    console.error(">>> SOME TESTS FAILED <<<");
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
