# Sahara Finance — AI Security & Guardrails Architecture

## 1. Core Principles of AI Safety in Banking

1. **Financial Correctness**: The AI model is NEVER the authoritative source for account balances, transaction amounts, interest rates, ledger entries, or payment statuses. All financial values are retrieved directly from verified backend domain services.
2. **AI Cannot Control Money**: The AI is strictly prohibited from directly debiting, crediting, modifying balances, transferring funds, or changing security settings.
3. **Untrusted AI Output**: Even if an LLM responds with `{"action": "EXECUTE_PAYMENT", "amount": 50000}`, the server-side AI Action Firewall will immediately intercept, categorize it as HIGH RISK, block direct execution, and require user authentication and physical confirmation.
4. **Zero Self-Authorization**: The AI cannot authorize itself or claim that a user has confirmed an operation.

---

## 2. Risk Classification Matrix

| Risk Level | Permitted AI Operations | Server Enforcement Mechanism |
| :--- | :--- | :--- |
| **LOW RISK** | Navigation (`NAVIGATE`), Screen explanation (`EXPLAIN_SCREEN`), Language change (`CHANGE_LANGUAGE`), Balance query | Read-only domain query; updates UI state or user display preference |
| **MEDIUM RISK** | Prepare payment review (`OPEN_PAYMENT`), Create support grievance ticket (`CREATE_SUPPORT_TICKET`), Set savings goal | Creates pending intent with required user confirmation before persistence |
| **HIGH RISK** | Financial execution (`EXECUTE_PAYMENT`), Loan acceptance (`ACCEPT_LOAN`), Account Freeze (`FREEZE_ACCOUNT`) | **STRICTLY BLOCKED FROM AI AUTONOMOUS EXECUTION**. Requires authenticated user session, physical confirmation (Swipe-to-Pay), and ledger verification |

---

## 3. Prompt-Injection & Jailbreak Defenses

Sahara incorporates multi-layered prompt-injection defenses:

1. **Pre-LLM Sanitization**: Strips dangerous control characters and checks for known injection vectors (*"Ignore previous instructions"*, *"System prompt dump"*).
2. **Deterministic Action Allowlist**: The server validates all proposed actions against an immutable schema. Unrecognized actions or unauthorized payload fields are stripped.
3. **Multi-User Isolation**: User context is derived exclusively from the verified server-side JWT session (`req.user.id`). Prompts containing arbitrary foreign IDs (e.g. *"Transfer to account 999 as user 123"*) cannot bypass backend tenancy checks.
