# Sahara Finance — Automated Testing Suite & Verification Matrix

## 1. Test Suite Overview

Sahara Finance includes 8 comprehensive automated test suites covering authentication, financial ledger invariants, multi-tenant isolation, AI guardrails, accessibility, and performance:

| Command | Focus Area | Test Cases |
| :--- | :--- | :--- |
| `npm test` | Authentication, OTP Lifecycle, JWT & Rate Limits | 11 Tests |
| `npm run test:phase3` | Onboarding State Machine, Consent & KYC | 17 Tests |
| `npm run test:phase4` | Account Balances, Pagination & User Data Isolation | 14 Tests |
| `npm run test:phase5` | Merchant Lookup, Payment Intents, Idempotency | 14 Tests |
| `npm run test:phase6` | Micro-Loans, EMI Ledger Integration & Support SLA | 13 Tests |
| `npm run test:phase7` | OmniDimension Voice, Chat & Action Guardrails | 13 Tests |
| `npm run test:phase8` | Master E2E User Journey & Fuzzing | 31 Tests |
| `npm run test:hardening` | Production Headers, Rate Limits & Error Sanitization | 10 Tests |
| **Total** | **Comprehensive Regression Matrix** | **123 Automated Tests** |

---

## 2. Running All Tests

```bash
cd backend
npm test
npm run test:phase3
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:hardening
```
