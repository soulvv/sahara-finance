# Sahara Finance Backend API
Node.js + Express + TypeScript + MongoDB backend with Completely Free Demo OTP Authentication, Onboarding State Machine, Privacy Audit Trail, Demo KYC, Demo Accounts/Transactions Ledger, Atomic Payment Execution, Demo Micro-Loans & EMI Repayments, and Grievance/Support Ticketing.

## Setup & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Ensure `.env` exists (copy from `.env.example` if needed).

3. **Seed Demo User, Account, Transactions, Merchants & Loans:**
   ```bash
   npm run seed
   ```

4. **Start Development Server (Port 5000):**
   ```bash
   npm run dev
   ```

5. **Run Automated Test Suites:**
   ```bash
   npm run test          # Phase 1 & 2 Auth tests
   npm run test:phase3   # Phase 3 Onboarding & KYC tests
   npm run test:phase4   # Phase 4 Balance & Transactions tests
   npm run test:phase5   # Phase 5 Payments & Internal Ledger tests
   npm run test:phase6   # Phase 6 Loans, EMI & Support Ticket tests
   ```

6. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

---

## Phase 6 Features

### 1. Demo Micro-Loans & Repayment Schedule (`/api/loans`)
* `GET /api/loans/active`: Returns authenticated user's active loan (Principal: `₹5,000`, Interest: `₹400`, Total: `₹5,400`, Monthly EMI: `₹1,800`), with server-calculated `repaidPercent` and next due date.
* `GET /api/loans/:loanId/repayments`: Returns the 3-installment repayment schedule with installment statuses (`PAID`, `DUE`, `UPCOMING`).
* `POST /api/loans/:loanId/repay`: Atomically debits the next due EMI installment (`₹1,800`) from the user's account via the internal ledger, updates installment status to `PAID`, adjusts loan remaining balance, and transitions loan to `PAID` once fully settled.

### 2. Support Grievance Ticketing System (`/api/assistance/tickets`)
* `POST /api/assistance/tickets`: Creates a support grievance ticket with category (`FAILED_PAYMENT`, `PAYMENT_DISPUTE`, `ACCOUNT_HELP`, etc.), server-generated collision-resistant ticket number (`SAH-2026-XXXX`), and 2-hour SLA.
* `GET /api/assistance/tickets/:id`: Retrieves ticket details and resolution status (`IN_REVIEW`, `RESOLVED`, `REJECTED`).
* `GET /api/assistance/tickets`: Returns the list of all support tickets for the authenticated user.

> [!IMPORTANT]
> **Demo Loan & Support Disclaimer**:
> All micro-loan repayment and support ticketing workflows operate exclusively within MongoDB for prototype evaluation. No real financial institutions, credit bureaus, or external customer CRM/SMS services are connected.
