# Sahara Finance — OmniDimension AI & Multilingual Assistance Architecture

## Overview

**Sahara Saathi** is an AI-assisted, voice-first financial companion built on the **OmniDimension** platform. It is specifically engineered to onboard first-time and low-literacy users into digital finance by breaking through literacy, language, and trust barriers.

Users interact with Sahara Finance through three coordinated channels:
1. **Web Voice Conversation**: Live 3D audio-reactive voice session.
2. **Saathi Chat Modal**: Conversational chat interface with interactive action cards and speech output.
3. **Outbound Phone Assistance**: Automated callback dispatch directly to the user's verified phone number.

---

## 1. System Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   SAHARA CLIENT / PWA                   │
       │     OmniVoiceExperience  │  SaathiChat  │  PhoneModal   │
       └────────────────────────────┬────────────────────────────┘
                                    │ HTTPS / Action Dispatch
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                 SAHARA EXPRESS BACKEND                  │
       │    /api/omnidim/session/voice  │  /api/omnidim/chat     │
       │    /api/omnidim/call/request   │  /actions/confirm      │
       └──────────────┬───────────────────────────┬──────────────┘
                      │                           │
                      ▼                           ▼
       ┌─────────────────────────────┐   ┌───────────────────────┐
       │  CONTROLLED ACTION ENGINE   │   │  OMNIDIMENSION API    │
       │ - Action Registry & Limits  │   │  REST: omnidim.io/v1  │
       │ - Security Guardrails       │   │  WebVoice Sessions    │
       │ - Audit Logging (MongoDB)   │   │  Telephony Dispatch   │
       └─────────────────────────────┘   └───────────────────────┘
```

> [!IMPORTANT]
> **API Key Protection**:
> The OmniDimension API Key (`OMNIDIM_API_KEY`) is strictly server-side and is **never** sent to the client browser, logged, or exposed in frontend JS bundles.

---

## 2. Sahara Saathi Agent Persona & Guardrails

* **Agent Name**: Sahara Saathi
* **Languages Supported**: Hindi (`hi-IN`), Hinglish, English (`en-IN`)
* **Voice Persona**: Warm, patient, non-judgmental Indian voice (`ananya_warm_indian`)
* **Communication Principles**:
  - Avoids banking jargon (e.g. explains ledgers as a digital *khata-bahi*).
  - Asks one simple question at a time.
  - Explains concepts step-by-step before proposing actions.

### Strict Financial Guardrails:
1. **NEVER autonomously execute transactions**: Saathi can pre-fill safe payment fields (amount, recipient) and open `/pay`, but the user **must physically review and swipe/confirm on the payment screen**.
2. **NEVER ask or disclose credentials**: Rejects any requests for OTP, PINs, or passwords.
3. **Controlled Action Allowlist**: Blocks arbitrary URLs, shell execution, or database commands.

---

## 3. Controlled Website Action Registry

All actions emitted by OmniDimension are validated and normalized by the backend Action Engine before execution.

| Action Type | Risk Level | Requires Confirmation | Description | Execution Flow |
| :--- | :---: | :---: | :--- | :--- |
| `NAVIGATE` | **LOW** | ❌ No | Navigates to a safe screen (`DASHBOARD`, `ONBOARDING`, `PAY`, `LOAN`, `HELP`, `PROFILE`). | Frontend router navigation (`wouter`). |
| `CHANGE_LANGUAGE` | **LOW** | ❌ No | Changes preferred language (`hi`, `hinglish`, `en`). | Updates MongoDB `User.preferredLanguage` + Zustand store. |
| `SHOW_BALANCE` | **LOW** | ❌ No | Highlights current live balance on Dashboard. | Navigates to `/dashboard?focus=balance`. |
| `SHOW_LOAN` | **LOW** | ❌ No | Explains loan terms and navigates to loan breakdown. | Navigates to `/loan`. |
| `OPEN_PAYMENT` | **LOW** | ❌ No | Pre-fills amount and recipient for review. | Navigates to `/pay?amount=500&recipient=Rahul`. |
| `OPEN_HELP` | **LOW** | ❌ No | Opens grievance support ticket page. | Navigates to `/help`. |
| `UPDATE_NAME` | **MEDIUM** | ✅ **Yes** | Updates user's registered name. | Prompts user with *"Haan, update karein"* / *Cancel*. Executes upon `/api/omnidim/actions/confirm`. |
| `EXECUTE_PAYMENT` | **HIGH** | ⛔ **BLOCKED** | Direct transfer of funds. | **Strictly rejected by backend guardrail**. |

---

## 4. API Endpoints Reference

### 1. `POST /api/omnidim/session/voice`
* **Auth**: Required (`Bearer <JWT>`)
* **Purpose**: Provisions an ephemeral WebVoice session.
* **Response**:
```json
{
  "success": true,
  "session": {
    "sessionId": "asst_1788111000_abc123",
    "wsUrl": "wss://api.omnidimension.io/v1/voice/stream?session=asst_1788111000_abc123&token=...",
    "expiresInSeconds": 300,
    "agentId": "sahara-saathi-prod"
  }
}
```

### 2. `POST /api/omnidim/chat`
* **Auth**: Required (`Bearer <JWT>`)
* **Request**:
```json
{
  "message": "Hindi mein kar do",
  "language": "hinglish"
}
```
* **Response**:
```json
{
  "success": true,
  "reply": "Ji bilkul! Maine aapki bhasha Hindi mein badal di hai.",
  "actions": [
    {
      "actionId": "act_1788111000_xyz",
      "type": "CHANGE_LANGUAGE",
      "payload": { "language": "hi" },
      "riskLevel": "LOW",
      "requiresConfirmation": false,
      "executed": true
    }
  ],
  "intent": "CHANGE_LANGUAGE"
}
```

### 3. `POST /api/omnidim/actions/confirm`
* **Auth**: Required (`Bearer <JWT>`)
* **Request**:
```json
{
  "actionId": "act_1788111000_xyz",
  "confirmed": true,
  "actionType": "UPDATE_NAME",
  "payload": { "name": "Shubham Singh" }
}
```

### 4. `POST /api/omnidim/call/request`
* **Auth**: Required (`Bearer <JWT>`)
* **Request**: `{ "reason": "ASSISTED_ONBOARDING" }`
* **Behavior**: Dispatches outbound call to authenticated user's registered phone number.
* **Response**:
```json
{
  "success": true,
  "callId": "call_1788111000_4444",
  "status": "REQUESTED",
  "message": "Saathi aapko +91 98XXXXX3210 par call kar raha hai. Kripya phone uthayein."
}
```

### 5. `GET /api/omnidim/status`
* **Auth**: Public
* **Returns**: OmniDimension integration mode (`mock` or `real`), configuration status, and supported channels.

---

## 5. Free-Tier vs Real OmniDimension Modes

* **`OMNIDIM_MODE=mock`** (Default for local development & automated CI tests):
  - Uses an intelligent local Hindi/Hinglish/English natural language intent engine.
  - Zero API credits consumed.
  - Full simulation of sessions, chat action cards, and phone call lifecycle.
* **`OMNIDIM_MODE=real`** (For production deployment):
  - Connects to OmniDimension REST API (`https://omnidim.io/api/v1`) using `OMNIDIM_API_KEY`.
  - Dispatches live WebVoice audio streams and carrier phone calls.
