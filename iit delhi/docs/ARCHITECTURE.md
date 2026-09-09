# Sahara Finance (सहारा) — System Architecture

## 1. High-Level Architecture Overview

Sahara Finance is an AI-native, voice-first digital banking operating system built for Bharat. It allows users to interact with their finances naturally in Hindi, Hinglish, and English while maintaining financial invariants, multi-tenant data isolation, AI action firewall guardrails, and cryptographic transaction verification.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SAHARA FINANCE PLATFORM                         │
├───────────────────────────────────┬────────────────────────────────────┤
│           CLIENT TIER             │           INTELLIGENCE             │
│  • React 19 Mobile-First PWA      │  • Multi-Turn Context Engine       │
│  • Senior & Visually Impaired Mode│  • Hindi/Hinglish Entity Extractor │
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

---

## 2. End-to-End Transaction & AI Request Flow

```
User Spoken/Typed Request
          │
          ▼
┌──────────────────┐
│   Frontend PWA   │  (WebVoice WebSocket / REST Client)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│   API Gateway    │  (Helmet, CORS, Rate Limiters, X-Request-ID)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│   Auth / JWT     │  (HS256 Session Verification, Role & Account Ownership)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│    AI Gateway    │  (OmniDimension Saathi Agent, Intent Detection)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Entity Normalizer│  (Amount normalization: "paanch sau" -> ₹500, Disambiguation)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ AI Policy Firewall│ (Block direct money movement; classify risk: LOW/MED/HIGH)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Domain Service  │  (Balance check, Loan calculation, Merchant lookup)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Double-Entry     │  (Atomic debit/credit ledger, Idempotency key protection)
│ Ledger Engine    │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Persistence & DB │  (MongoDB with dual-mode in-memory resilience)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Verifiable Receipt│ (Cryptographic SHA-256 hash, public verification)
└──────────────────┘
```

---

## 3. Technology Stack & Directory Layout

### Backend
- **Runtime**: Node.js v20+ with TypeScript (ESNext bundle).
- **Framework**: Express 4.21 with Helmet 8.3, CORS, express-rate-limit.
- **Database**: Dual-mode MongoDB (Mongoose 8.8) with automated in-memory fallback engine for local/offline testing.
- **Voice / Telephony**: OmniDimension WebVoice API & Outbound SIP dispatch.
- **Security**: JWT authentication, rate limiting, request correlation IDs (`X-Request-ID`), AI Action Policy Firewall.

### Frontend
- **Framework**: React 19 with Vite 6.
- **Styling**: Tailwind CSS 3.4 with custom theme tokens (`saffron`, `navy`, `sand`, `forest`).
- **Routing**: Wouter lightweight client-side router with route-guard middleware.
- **Animations**: Framer Motion with global `reducedMotion="user"` accessibility support.
- **3D & Audio Visualizers**: Three.js audio-reactive vault and voice waveform canvas.
