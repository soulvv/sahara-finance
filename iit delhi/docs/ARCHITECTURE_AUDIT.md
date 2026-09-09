# Sahara Finance — Phase 0 Architecture Audit & Master Upgrade Strategy

## 1. Executive Summary & Codebase State

This audit assesses the current state of **Sahara Finance (सहारा)** as of September 2026. The platform currently includes:
- **Backend**: Node.js + Express 4.21 with TypeScript, Helmet, rate limiters, request correlation IDs, Mongoose database models, in-memory double-entry accounting routines, OmniDimension AI voice & telephony modules, and 8 automated test suites.
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 3.4 + Wouter router + Framer Motion + Lucide icons + Three.js 3D visualizers + Web Audio API waveform analyzer.
- **AI Integration**: Multi-channel OmniDimension platform integration for real-time WebSockets voice, conversational text chat, outbound SIP telephony dispatch, and a controlled action engine.

---

## 2. Component-by-Component Architectural Audit

### 2.1 Authentication & Session Management
- **Current State**: Uses mobile phone + 6-digit OTP demo flow. Generates signed JWTs (HS256) with 7-day expiration. Includes rate limiting (10 requests/15m) and brute-force attempt tracking.
- **Strengths**: Clean separation of OTP generation, validation, and session issuance.
- **Technical Debt & Security Opportunities**:
  - Session invalidation on logout is client-side only (JWT is stateless).
  - Needs device fingerprinting and active session tracking to support "Logout all other devices" (Feature 18).
  - Needs adaptive authentication mechanisms (e.g. step-up verification for higher-risk transfers).

### 2.2 Financial Ledger & Payments
- **Current State**: Atomic double-entry principles implemented in [`ledger.service.ts`](file:///./backend/src/services/ledger.service.ts) and [`payment.service.ts`](file:///./backend/src/services/payment.service.ts). Payments support unique `idempotencyKey`, debit/credit transaction records, and user balance checks.
- **Strengths**: Enforces balance invariants ($Debit == Credit$). Rejects overdrafts.
- **Technical Debt & Security Opportunities**:
  - Monetary units currently use JavaScript floating-point numbers in some calculation paths. Needs strict integer minor units (paise) to eliminate floating-point arithmetic errors.
  - Payment state machine needs explicit state lifecycle (`CREATED` -> `PENDING_CONFIRMATION` -> `CONFIRMED` -> `PROCESSING` -> `SUCCESS` / `FAILED` / `REVERSED`).
  - Needs a cryptographic receipt verification engine (`/verify/:receiptId`).

### 2.3 OmniDimension AI Voice & Action Engine
- **Current State**: [`action.service.ts`](file:///./backend/src/services/omnidim/action.service.ts) and [`chat.service.ts`](file:///./backend/src/services/omnidim/chat.service.ts) validate AI proposals against an allowlist and block high-risk actions (`EXECUTE_PAYMENT`).
- **Strengths**: Strict server-side validation; AI proposals cannot execute financial debits autonomously.
- **Technical Debt & Security Opportunities**:
  - The action framework should be elevated into a dedicated, modular **AI Policy Firewall** (`backend/src/services/ai/policy/`) with formal risk assessment, action expiration nonces, and structured user confirmation.
  - Need a dedicated natural-language entity extraction engine that normalizes spoken amounts (e.g. *"paanch sau"* -> `500 INR`) and resolves numeric ambiguities (e.g. ₹500 vs ₹5,000).
  - Need structured conversational context across turns without conferring transaction authority.

### 2.4 Database & Persistence Layer
- **Current State**: Mongoose models connect to MongoDB. When running in environments where a local mongod daemon is not running, database connection failure aborts server boot.
- **Technical Debt & Enhancement**:
  - Implement seamless dual-mode database resilience: connect to real MongoDB when available, and fall back to an in-memory storage adapter for offline testing, CI, and instant zero-dependency hackathon demonstrations.

### 2.5 Frontend Architecture & Accessibility
- **Current State**: 16 views in Wouter, audio visualizers in Three.js, responsive layouts.
- **Technical Debt & Opportunities**:
  - Senior Mode, Visually Impaired Mode (strong ARIA semantics, high-contrast, screen-reader focus handling), and Low-Literacy Mode need dedicated UI toggles and persistent preferences.
  - Reduced Motion needs to pause/dim Three.js animations and simplify Framer Motion springs.
  - PWA offline caching should indicate data freshness ("Last synced: ...") without presenting stale balances as authoritative.

---

## 3. Master 8-Phase Upgrade Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SAHARA FINANCE PLATFORM                         │
├───────────────────────────────────┬────────────────────────────────────┤
│           CLIENT TIER             │           INTELLIGENCE             │
│  • React 19 Mobile-First PWA      │  • Multi-Turn Context Engine       │
│  • Senior / High-Contrast Modes   │  • Hindi/Hinglish Entity Extractor │
│  • Three.js Audio-Reactive Vault  │  • Safe-to-Spend Analyzer          │
│  • Physical Swipe-to-Pay Slider   │  • Scam / Fraud Detector           │
│  • Judge / Demo Mode Scenarios    │  • What-If & Loan Simulator        │
├───────────────────────────────────┼────────────────────────────────────┤
│          SECURITY TIER            │           CORE BANKING             │
│  • AI Action Policy Firewall      │  • Invariant Double-Entry Ledger   │
│  • Risk Engine & Anomaly Detector │  • Micro-Units (Paise) Arithmetic  │
│  • Adaptive Step-Up Auth          │  • Micro-Loans & EMI Engine        │
│  • Emergency Account Freeze       │  • 2-Hour SLA Grievance System     │
│  • Tamper-Evident Audit Chain     │  • Verifiable Cryptographic Receipt│
└───────────────────────────────────┴────────────────────────────────────┘
```

### Phase Breakdown:
1. **Phase 1 — Foundation & AI Policy Engine**: Architecture audit, secret management, typed contracts, modular AI Policy Firewall (`policy.service.ts`, `risk.service.ts`, `action-validator.ts`), database resilience.
2. **Phase 2 — AI Copilot & Financial Queries**: Natural language intent parser, Hinglish/vernacular entity extraction, numeric ambiguity protection, multi-turn conversation context, "Explain this screen".
3. **Phase 3 — Financial Intelligence**: Safe-to-Spend service (`safe-to-spend.service.ts`), transaction auto-categorization, spending analytics, non-credit financial health score, savings goals, financial calendar, what-if & loan simulators.
4. **Phase 4 — Fraud, Risk & Adaptive Security**: Fraud/scam message analyzer, transaction anomaly detection, adaptive authentication thresholds (`risk-policy.config.ts`), emergency account freeze, dispute tracking, device security center.
5. **Phase 5 — Accessibility & Multilingual Inclusivity**: Senior Mode, Visually Impaired mode, high-contrast theme, reduced-motion controls, low-literacy iconographic UI, typed multi-language expansion dictionary.
6. **Phase 6 — Transaction Infrastructure**: Merchant QR scan/pay flow, payment state machine, idempotent duplicate & replay protection, verifiable receipt generation (`/verify/:receiptId`), telephony & offline PWA sync.
7. **Phase 7 — Operations & Observability**: Support admin console, SLA escalation engine, ledger visualizer, reconciliation engine, structured audit trail & tamper-evident audit chain.
8. **Phase 8 — Hackathon Demo & Judge Mode**: Interactive Judge Mode with 7 scripted scenarios, Demo Mode toggle, failure/chaos simulator, performance metrics.

---

## 4. Migration & Backward Compatibility Rules

1. **Do Not Touch `.env` Files**: Rely strictly on existing process environment variables and standard defaults.
2. **Preserve Existing Working Routes**: Maintain 100% backward compatibility for all existing endpoints (`/api/auth/*`, `/api/account/*`, `/api/payments/*`, `/api/loans/*`, `/api/omnidim/*`).
3. **Additive Extensions**: New capabilities mount cleanly under modular routers (e.g. `/api/ai/*`, `/api/intelligence/*`, `/api/security/*`, `/api/admin/*`, `/api/judge/*`).
4. **Zero Flaky Tests**: All existing test suites continue to pass alongside newly introduced comprehensive test suites.
