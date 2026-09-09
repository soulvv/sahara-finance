# Sahara Finance — Privacy, Data Governance & Consent

## 1. Privacy-by-Default Architecture

Sahara is built on strict data minimization and user-centric consent principles:

1. **Ephemeral Processing**:
   - Aadhaar cards and identity documents are verified in-memory during onboarding. Raw scanned images are never persisted to the disk or cloud storage.
   - Document identifiers are strictly masked (`XXXX-XXXX-1234`) across all user-facing views and database records.
2. **Voice Privacy**:
   - Real-time voice streams are processed ephemerally over secure WebSockets.
   - Voice audio is not retained or used for secondary training without explicit user consent.
3. **Multi-Tenant Data Isolation**:
   - All account balances, transactions, payment intents, and loan repayment records are isolated by authenticated user ID (`req.user.id`).
   - Zero ID overlap between users is verified continuously in automated security test suites.

---

## 2. Consent Center

Users maintain granular control over their data in the **Privacy Dashboard**:
- Voice Assistant Processing Consent (Enabled / Disabled)
- Personalized Financial Insights Consent (Enabled / Disabled)
- Telephony Assistance Consent (Enabled / Disabled)
- Complete Right to Revoke Consent with immediate audit logging.
