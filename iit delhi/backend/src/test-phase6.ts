/**
 * Comprehensive Automated Test Suite for Sahara Finance — Phase 6
 * (Loans, EMI Repayment Schedule, Ledger Debits & Support Tickets)
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

async function runPhase6Tests() {
  console.log("=== SAHARA FINANCE PHASE 6 TEST SUITE ===");
  console.log("Testing Loans, EMI Repayments, Ledger Integration, and Support Tickets...\n");

  // 1. Health check
  const healthRes = await request("/api/health");
  await assert(
    1,
    "GET /api/health",
    healthRes.status === 200 && healthRes.data.success === true,
    `Status ${healthRes.status}`
  );

  // 2. Unauthenticated access protection
  const unauthLoan = await request("/api/loans/active");
  const unauthTicket = await request("/api/assistance/tickets");

  await assert(
    2,
    "Loan and Ticket endpoints reject unauthenticated requests (401)",
    unauthLoan.status === 401 && unauthTicket.status === 401,
    `Loan: ${unauthLoan.status}, Ticket: ${unauthTicket.status}`
  );

  // 3. Register a fresh test user A
  const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;
  const sendOtpA = await request("/api/auth/send-otp", {
    method: "POST",
    body: { phone: phoneA },
  });
  const verifyA = await request("/api/auth/verify-otp", {
    method: "POST",
    body: { phone: phoneA, otp: sendOtpA.data.demoOtp, requestId: sendOtpA.data.requestId },
  });
  const tokenA = verifyA.data.token;

  await assert(
    3,
    "Fresh Test User A authenticated with token",
    verifyA.status === 200 && Boolean(tokenA),
    `Data: ${JSON.stringify(verifyA.data)}`
  );

  // 4. Active loan retrieval (triggers demo loan bootstrap with 1 installment due)
  const activeLoanRes = await request("/api/loans/active", { token: tokenA });
  const loan = activeLoanRes.data?.loan;

  await assert(
    4,
    "GET /api/loans/active returns micro-loan details with calculated repaidPercent (67%)",
    activeLoanRes.status === 200 &&
      activeLoanRes.data.success === true &&
      Boolean(loan?.loanId) &&
      loan.principalAmount === 5000 &&
      loan.interestAmount === 400 &&
      loan.totalRepayable === 5400 &&
      loan.monthlyEmi === 1800 &&
      loan.paidAmount === 3600 &&
      loan.remainingAmount === 1800 &&
      loan.repaidPercent === 67 &&
      loan.status === "ACTIVE",
    `Loan response: ${JSON.stringify(activeLoanRes.data)}`
  );

  // 5. Repayment schedule retrieval
  const repaymentsRes = await request(
    `/api/loans/${loan.loanId}/repayments`,
    { token: tokenA }
  );

  await assert(
    5,
    "GET /api/loans/:loanId/repayments returns 3-installment schedule (2 PAID, 1 DUE)",
    repaymentsRes.status === 200 &&
      repaymentsRes.data.success === true &&
      Array.isArray(repaymentsRes.data.repayments) &&
      repaymentsRes.data.repayments.length === 3 &&
      repaymentsRes.data.repayments[0].status === "PAID" &&
      repaymentsRes.data.repayments[1].status === "PAID" &&
      repaymentsRes.data.repayments[2].status === "DUE",
    `Repayments response: ${JSON.stringify(repaymentsRes.data)}`
  );

  // Fetch initial account balance
  const balBeforeRes = await request("/api/account/balance", { token: tokenA });
  const balBefore = balBeforeRes.data.account.balance;

  // 6. Execute EMI Repayment
  const repayRes = await request(`/api/loans/${loan.loanId}/repay`, {
    method: "POST",
    token: tokenA,
    body: { idempotencyKey: "emi-key-" + Date.now() },
  });

  await assert(
    6,
    "POST /api/loans/:loanId/repay debits EMI and completes loan",
    repayRes.status === 200 &&
      repayRes.data.success === true &&
      repayRes.data.loan.remainingAmount === 0 &&
      repayRes.data.loan.repaidPercent === 100 &&
      repayRes.data.loan.status === "PAID" &&
      repayRes.data.repayment.status === "PAID",
    `Repay response: ${JSON.stringify(repayRes.data)}`
  );

  // 7. Atomic balance decrement verification
  const balAfterRes = await request("/api/account/balance", { token: tokenA });
  const balAfter = balAfterRes.data.account.balance;

  await assert(
    7,
    "Account balance decremented atomically by ₹1,800 via internal ledger",
    balAfter === balBefore - 1800,
    `Before: ${balBefore}, After: ${balAfter}`
  );

  // 8. Transaction created for EMI payment
  const txRes = await request("/api/transactions/recent?limit=5", {
    token: tokenA,
  });
  const latestTx = txRes.data.transactions[0];

  await assert(
    8,
    "EMI repayment appears in recent transactions as LOAN_EMI debit",
    txRes.status === 200 &&
      latestTx.type === "DEBIT" &&
      latestTx.category === "LOAN_EMI" &&
      latestTx.amount === -1800,
    `Latest tx: ${JSON.stringify(latestTx)}`
  );

  // 9. Re-attempting repayment on fully paid loan fails safely
  const duplicateRepay = await request(`/api/loans/${loan.loanId}/repay`, {
    method: "POST",
    token: tokenA,
    body: { idempotencyKey: "emi-dup-" + Date.now() },
  });

  await assert(
    9,
    "Re-attempting repayment on fully paid loan returns LOAN_ALREADY_PAID (400)",
    duplicateRepay.status === 400 &&
      duplicateRepay.data.code === "LOAN_ALREADY_PAID",
    `Dup repay status: ${duplicateRepay.status}, code: ${duplicateRepay.data?.code}`
  );

  // 10. Support ticket creation
  const createTicketRes = await request("/api/assistance/tickets", {
    method: "POST",
    token: tokenA,
    body: {
      category: "FAILED_PAYMENT",
      reportedIssue: "Payment failed at Rahul General Store but money was deducted.",
      recordedViaVoice: true,
    },
  });

  const createdTicket = createTicketRes.data?.ticket;
  await assert(
    10,
    "POST /api/assistance/tickets creates support ticket with SLA and unique number",
    createTicketRes.status === 201 &&
      createTicketRes.data.success === true &&
      Boolean(createdTicket?.ticketId) &&
      createdTicket.ticketId.startsWith("SAH-2026-") &&
      createdTicket.status === "IN_REVIEW" &&
      createdTicket.estimatedResolutionTime === "2 hours",
    `Ticket response: ${JSON.stringify(createTicketRes.data)}`
  );

  // 11. Support ticket retrieval
  const getTicketRes = await request(
    `/api/assistance/tickets/${createdTicket.ticketId}`,
    { token: tokenA }
  );

  await assert(
    11,
    "GET /api/assistance/tickets/:id returns full ticket information",
    getTicketRes.status === 200 &&
      getTicketRes.data.success === true &&
      getTicketRes.data.ticket.ticketId === createdTicket.ticketId &&
      getTicketRes.data.ticket.status === "IN_REVIEW",
    `Get ticket response: ${JSON.stringify(getTicketRes.data)}`
  );

  // 12. User tickets listing
  const listTicketsRes = await request("/api/assistance/tickets", {
    token: tokenA,
  });

  await assert(
    12,
    "GET /api/assistance/tickets lists all tickets for authenticated user",
    listTicketsRes.status === 200 &&
      listTicketsRes.data.success === true &&
      Array.isArray(listTicketsRes.data.tickets) &&
      listTicketsRes.data.tickets.length >= 1,
    `Tickets count: ${listTicketsRes.data.tickets?.length}`
  );

  // 13. User Data Isolation: User B cannot access User A's loan or tickets
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

  const crossUserLoan = await request(`/api/loans/${loan.loanId}`, {
    token: tokenB,
  });
  const crossUserTicket = await request(
    `/api/assistance/tickets/${createdTicket.ticketId}`,
    { token: tokenB }
  );

  await assert(
    13,
    "User B cannot access User A's loan or support tickets (403 UNAUTHORIZED)",
    crossUserLoan.status === 403 && crossUserTicket.status === 403,
    `Cross loan: ${crossUserLoan.status}, Cross ticket: ${crossUserTicket.status}`
  );

  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  if (passed === total) {
    console.log(">>> ALL 13 PHASE 6 TESTS PASSED PERFECTLY! <<<");
  } else {
    console.error(">>> SOME TESTS FAILED <<<");
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
