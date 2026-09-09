# Sahara Finance — Threat Model & Security Architecture

## 1. Threat Vectors & Defense Invariants

| Threat Vector | Potential Impact | Sahara Defense Mechanism |
| :--- | :--- | :--- |
| **AI Prompt Injection / Jailbreaking** | Attacker convinces LLM to bypass authorization | Deterministic server-side AI Policy Firewall. AI cannot self-authorize; financial transactions strictly require physical Swipe-to-Pay confirmation |
| **Insecure Direct Object Reference (IDOR)** | User A reads/alters User B's transactions or loans | Strict tenant binding on all routes using verified JWT identity (`req.user.id`). Automated zero-overlap regression tests |
| **Network Replay & Race Conditions** | Duplicate debits on network retry or race condition | Client-side UUID `idempotencyKey` cached in atomic database transactions |
| **NoSQL / Operator Injection** | Malicious JSON operators in login/OTP | Strict regex validation (`/^\+91[6-9]\d{9}$/`), typed schemas, and parameter sanitization |
| **Biometric & KYC Data Leak** | Identity theft from stored identity documents | Ephemeral in-memory KYC processing; raw images are never stored on disk or in DB; document IDs masked |
| **Phishing / Social Engineering** | Scammers lure users into transferring funds | Integrated SMS/WhatsApp Scam Analyzer; Anomaly detector flagging unusual recipient velocity |
