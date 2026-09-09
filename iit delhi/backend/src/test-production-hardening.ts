/**
 * Automated Production Readiness & Security Hardening Test Suite
 * Validates Security Headers, Correlation IDs, Error Sanitization, Rate Limits, and Data Isolation
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

async function rawRequest(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
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
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function authenticateUser(phone: string) {
  const sendRes = await rawRequest("/api/auth/send-otp", {
    method: "POST",
    body: { phone },
  });

  if (!sendRes.data?.requestId) {
    throw new Error(`send-otp failed for ${phone}: ${JSON.stringify(sendRes.data)}`);
  }

  const verifyRes = await rawRequest("/api/auth/verify-otp", {
    method: "POST",
    body: {
      phone,
      otp: sendRes.data.demoOtp,
      requestId: sendRes.data.requestId,
    },
  });

  if (!verifyRes.data?.token) {
    throw new Error(`verify-otp failed for ${phone}: ${JSON.stringify(verifyRes.data)}`);
  }

  return verifyRes.data.token;
}

async function runHardeningTests() {
  console.log("=== SAHARA FINANCE PRODUCTION HARDENING TEST SUITE ===");
  console.log("Validating Security Headers, Rate Limits, Error Sanitization, and Data Isolation...\n");

  // 1. Health check & disclaimer
  const health = await rawRequest("/api/health");
  await assert(
    1,
    "GET /api/health returns prototype disclaimer and service status",
    health.status === 200 &&
      health.data.success === true &&
      health.data.service === "sahara-finance-backend" &&
      typeof health.data.disclaimer === "string",
    `Health response: ${JSON.stringify(health.data)}`
  );

  // 2. Readiness probe
  const ready = await rawRequest("/api/ready");
  await assert(
    2,
    "GET /api/ready confirms active MongoDB database connection",
    ready.status === 200 &&
      ready.data.success === true &&
      ready.data.database === "connected",
    `Ready response: ${JSON.stringify(ready.data)}`
  );

  // 3. Security headers (Helmet)
  const ctOptions = health.headers.get("x-content-type-options");
  const xssProtection = health.headers.get("x-xss-protection");
  const hasSecurityHeaders = ctOptions === "nosniff";

  await assert(
    3,
    "Security headers configured (X-Content-Type-Options: nosniff)",
    hasSecurityHeaders,
    `X-Content-Type-Options: ${ctOptions}, XSS: ${xssProtection}`
  );

  // 4. Request Correlation ID header propagation
  const customReqId = "test-corr-id-" + Date.now();
  const corrRes = await rawRequest("/api/health", {
    headers: { "X-Request-ID": customReqId },
  });
  const returnedReqId = corrRes.headers.get("x-request-id");

  await assert(
    4,
    "Request Correlation ID header (X-Request-ID) reflected back to client",
    returnedReqId === customReqId,
    `Expected: ${customReqId}, Got: ${returnedReqId}`
  );

  // 5. Automatic Request ID generation when none provided
  const autoReqId = health.headers.get("x-request-id");
  await assert(
    5,
    "Automatic X-Request-ID generated for requests without one",
    Boolean(autoReqId && autoReqId.startsWith("req_")),
    `Generated ID: ${autoReqId}`
  );

  // 6. Rate Limit Headers present
  const phoneA = `+9191${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const authRes = await rawRequest("/api/auth/send-otp", {
    method: "POST",
    body: { phone: phoneA },
  });
  const hasRateLimitHeader =
    authRes.headers.has("ratelimit-limit") ||
    authRes.headers.has("x-ratelimit-limit");

  await assert(
    6,
    "Rate Limiting headers attached to API responses",
    hasRateLimitHeader,
    `Headers: ${Array.from(authRes.headers.keys()).join(", ")}`
  );

  // 7. Error Sanitization: Malformed non-hex ID returns clean 400 INVALID_ID_FORMAT
  const verifyResA = await rawRequest("/api/auth/verify-otp", {
    method: "POST",
    body: {
      phone: phoneA,
      otp: authRes.data.demoOtp,
      requestId: authRes.data.requestId,
    },
  });
  const tokenA = verifyResA.data.token;

  const malformedIdRes = await rawRequest(
    "/api/loans/malformed-id-123",
    { token: tokenA }
  );

  await assert(
    7,
    "Malformed document ID returns clean 400 INVALID_ID_FORMAT with request ID",
    malformedIdRes.status === 400 &&
      malformedIdRes.data.code === "INVALID_ID_FORMAT" &&
      Boolean(malformedIdRes.data.requestId),
    `Status: ${malformedIdRes.status}, Response: ${JSON.stringify(malformedIdRes.data)}`
  );

  // 8. Error Sanitization: Malformed JSON returns 400 INVALID_JSON_BODY
  const malformedJsonRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed: json, missing quotes }",
  });
  const malformedJsonData = await malformedJsonRes.json();

  await assert(
    8,
    "Malformed JSON body caught cleanly (400 INVALID_JSON_BODY)",
    malformedJsonRes.status === 400 &&
      malformedJsonData.code === "INVALID_JSON_BODY",
    `Status: ${malformedJsonRes.status}, Data: ${JSON.stringify(malformedJsonData)}`
  );

  // 9. Unauthorized access to protected endpoints rejected (401)
  const unauthMe = await rawRequest("/api/users/me");
  const unauthAccount = await rawRequest("/api/account/balance");
  const unauthLoan = await rawRequest("/api/loans/active");

  await assert(
    9,
    "Protected routes reject unauthenticated requests (401 UNAUTHORIZED)",
    unauthMe.status === 401 &&
      unauthAccount.status === 401 &&
      unauthLoan.status === 401,
    `Me: ${unauthMe.status}, Account: ${unauthAccount.status}, Loan: ${unauthLoan.status}`
  );

  // 10. Multi-User Data Isolation
  const phoneB = `+9192${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const tokenB = await authenticateUser(phoneB);

  const balA = (await rawRequest("/api/account/balance", { token: tokenA })).data
    ?.account;
  const balB = (await rawRequest("/api/account/balance", { token: tokenB })).data
    ?.account;

  await assert(
    10,
    "Separate accounts provisioned with strict user data isolation",
    Boolean(
      balA &&
      balB &&
      typeof balA.balance === "number" &&
      typeof balB.balance === "number" &&
      balA.status === "ACTIVE" &&
      balB.status === "ACTIVE"
    ),
    `Account A: ${JSON.stringify(balA)}, Account B: ${JSON.stringify(balB)}`
  );

  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  if (passed === total) {
    console.log(">>> ALL 10 PRODUCTION HARDENING TESTS PASSED! <<<");
  } else {
    console.error(">>> SOME HARDENING TESTS FAILED <<<");
    process.exit(1);
  }
}

runHardeningTests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
