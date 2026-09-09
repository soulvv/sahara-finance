# Sahara Finance — API Reference Documentation

This document describes all REST API endpoints provided by the Sahara Finance backend service.

---

## 1. General Principles

### Base URL
* **Local Development**: `http://localhost:5000`
* **Production Deployment**: `https://<your-backend-domain>.onrender.com`

### Authentication
Protected endpoints require a standard JSON Web Token (JWT) supplied in the `Authorization` HTTP header:
```http
Authorization: Bearer <jwt_token>
```

### Rate Limits
| Endpoint Group | Window | Free-Tier Max Requests |
| :--- | :--- | :--- |
| **Global API (`/api/*`)** | 15 minutes | 300 / IP |
| **Authentication (`/api/auth/*`)** | 15 minutes | 10 / IP |
| **Financial Operations (`/api/payments/*`, `/api/loans/*`)** | 15 minutes | 30 / IP |
| **Support Tickets (`/api/assistance/*`)** | 15 minutes | 15 / IP |

---

## 2. Public & Health Endpoints

### `GET /api/health`
Returns service availability, timestamp, and prototype mode.
* **Auth**: None
* **Response (200 OK)**:
```json
{
  "success": true,
  "service": "sahara-finance-backend",
  "status": "healthy",
  "timestamp": "2026-08-30T17:00:00.000Z",
  "env": "production",
  "otpMode": "demo",
  "disclaimer": "Sahara Finance prototype - financial operations are simulated in a demo sandbox."
}
```

### `GET /api/ready`
Readiness probe that checks active MongoDB connectivity.
* **Auth**: None
* **Response (200 OK)**:
```json
{
  "success": true,
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-08-30T17:00:00.000Z"
}
```

---

## 3. Authentication Endpoints

### `POST /api/auth/send-otp`
Generates a time-limited 6-digit OTP for the specified mobile phone number.
* **Auth**: None (Protected by `authRateLimiter`)
* **Request Body**:
```json
{
  "phone": "+919876543210"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "requestId": "req_8b31a0e88b22e7d7",
  "demoOtp": "839201",
  "expiresInSeconds": 300,
  "isReturningUser": true,
  "message": "Demo OTP generated for evaluation."
}
```

### `POST /api/auth/verify-otp`
Validates the OTP code against the encrypted hash and issues a signed JWT session.
* **Auth**: None
* **Request Body**:
```json
{
  "phone": "+919876543210",
  "otp": "839201",
  "requestId": "req_8b31a0e88b22e7d7"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6740b...",
    "phone": "+919876543210",
    "name": "Ravi Kumar",
    "preferredLanguage": "hinglish",
    "onboardingStatus": "COMPLETED",
    "kycStatus": "VERIFIED"
  },
  "isNewUser": false,
  "nextRoute": "/dashboard"
}
```

### `POST /api/auth/logout`
Terminates the client session and removes stored credentials.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

## 4. User Profile & KYC Endpoints

### `GET /api/users/me`
Retrieves profile metadata for the authenticated user.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "6740b...",
    "phone": "+919876543210",
    "name": "Ravi Kumar",
    "preferredLanguage": "hinglish",
    "onboardingStatus": "COMPLETED",
    "kycStatus": "VERIFIED"
  }
}
```

### `POST /api/kyc/verify-document`
Submits an identity document (Aadhaar / PAN) for verified KYC status.
* **Auth**: Bearer Token
* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `documentType`: `"AADHAAR"` | `"PAN"`
  * `file`: Binary image/PDF (max 5MB)
* **Response (200 OK)**:
```json
{
  "success": true,
  "kyc": {
    "documentType": "AADHAAR",
    "documentNumberMasked": "XXXX-XXXX-2841",
    "verifiedName": "Ravi Kumar",
    "verificationStatus": "VERIFIED",
    "verifiedAt": "2026-08-30T17:00:00.000Z"
  }
}
```

---

## 5. Account & Transaction History Endpoints

### `GET /api/account/balance`
Returns the user's live account balance and status.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "account": {
    "accountId": "6740c...",
    "accountNumberMasked": "XXXX XXXX 2841",
    "balance": 8420.0,
    "currency": "INR",
    "status": "ACTIVE"
  }
}
```

### `GET /api/transactions/recent?limit=10`
Returns paginated recent transactions sorted newest first.
* **Auth**: Bearer Token
* **Query Parameters**:
  * `limit` (optional): Integer 1–50 (default: 10)
* **Response (200 OK)**:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "6740d...",
      "referenceId": "SAH-2026-8392",
      "type": "DEBIT",
      "category": "MERCHANT_PAYMENT",
      "amount": -500.0,
      "title": "Rahul General Store",
      "recipientName": "Rahul General Store",
      "recipientUpiId": "rahul.store@upi",
      "status": "SUCCESS",
      "createdAt": "2026-08-30T16:00:00.000Z"
    }
  ]
}
```

---

## 6. Payments & Internal Ledger Endpoints

### `GET /api/merchants/lookup?upiId=rahul.store@upi`
Resolves merchant name and verification status from a UPI handle.
* **Auth**: None
* **Response (200 OK)**:
```json
{
  "success": true,
  "merchant": {
    "merchantId": "6740e...",
    "name": "Rahul General Store",
    "upiId": "rahul.store@upi",
    "category": "Kirana & Grocery",
    "icon": "🏪",
    "verified": true
  }
}
```

### `POST /api/payments/initiate`
Creates a time-limited (10 min) payment review intent.
* **Auth**: Bearer Token
* **Request Body**:
```json
{
  "recipientUpi": "rahul.store@upi",
  "amount": 500
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "payment": {
    "paymentId": "6740f...",
    "amount": 500,
    "currency": "INR",
    "status": "INITIATED",
    "expiresAt": "2026-08-30T17:10:00.000Z",
    "merchant": {
      "merchantId": "6740e...",
      "name": "Rahul General Store",
      "upiId": "rahul.store@upi"
    }
  }
}
```

### `POST /api/payments/execute`
Atomically executes the payment intent, decrements account balance, and creates an audit transaction.
* **Auth**: Bearer Token
* **Request Body**:
```json
{
  "paymentId": "6740f...",
  "idempotencyKey": "uuid-v4-client-key"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "payment": {
    "paymentId": "6740f...",
    "status": "COMPLETED",
    "transactionId": "6740g...",
    "referenceId": "SAH-2026-7731",
    "remainingBalance": 7920.0
  }
}
```

---

## 7. Micro-Loans & EMI Repayment Endpoints

### `GET /api/loans/active`
Retrieves the user's active loan and progress percentage.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "loan": {
    "loanId": "6740h...",
    "loanNumber": "LN-501",
    "principalAmount": 5000,
    "interestAmount": 400,
    "totalRepayable": 5400,
    "paidAmount": 3600,
    "remainingAmount": 1800,
    "monthlyEmi": 1800,
    "durationMonths": 3,
    "repaidPercent": 67,
    "nextDueDate": "2026-09-12",
    "status": "ACTIVE"
  }
}
```

### `POST /api/loans/:loanId/repay`
Atomically executes the next due EMI installment via internal ledger.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "loan": {
    "loanId": "6740h...",
    "paidAmount": 5400,
    "remainingAmount": 0,
    "repaidPercent": 100,
    "status": "PAID"
  },
  "repayment": {
    "installmentNumber": 3,
    "amount": 1800,
    "status": "PAID",
    "paidAt": "2026-08-30T17:00:00.000Z"
  }
}
```

---

## 8. Support Grievance Ticketing Endpoints

### `POST /api/assistance/tickets`
Creates a support ticket with a collision-resistant ticket number and 2-hour SLA.
* **Auth**: Bearer Token
* **Request Body**:
```json
{
  "category": "FAILED_PAYMENT",
  "reportedIssue": "Payment failed at Rahul General Store but money was deducted.",
  "recordedViaVoice": true
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "ticket": {
    "ticketId": "SAH-2026-4444",
    "category": "FAILED_PAYMENT",
    "status": "IN_REVIEW",
    "reportedIssue": "Payment failed at Rahul General Store but money was deducted.",
    "estimatedResolutionTime": "2 hours",
    "createdAt": "2026-08-30T17:00:00.000Z"
  }
}
```

---

## 9. OmniDimension AI & Telephony Endpoints

### `GET /api/omnidim/status`
Returns OmniDimension integration status and supported channels.
* **Auth**: None
* **Response (200 OK)**:
```json
{
  "success": true,
  "service": "omnidim-integration",
  "mode": "real",
  "isConfigured": true,
  "agent": "Sahara Saathi",
  "supportedChannels": ["WEB_VOICE", "CHAT", "PHONE"],
  "languages": ["hi", "hinglish", "en"]
}
```

### `POST /api/omnidim/session/voice`
Provisions an ephemeral WebVoice session with WebSocket streaming URL.
* **Auth**: Bearer Token
* **Response (201 Created)**:
```json
{
  "success": true,
  "session": {
    "sessionId": "asst_1788111000_abc123",
    "wsUrl": "wss://api.omnidim.io/v1/voice/stream?session=asst_1788111000_abc123&token=...",
    "expiresInSeconds": 300,
    "agentId": "246626"
  }
}
```

### `POST /api/omnidim/chat`
Conversational chat processor with structured action emission and security guardrails.
* **Auth**: Bearer Token
* **Request Body**:
```json
{
  "message": "Hindi mein kar do",
  "language": "hinglish"
}
```
* **Response (200 OK)**:
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

### `POST /api/omnidim/call/request`
Dispatches an outbound phone assistance callback to the authenticated user's registered number.
* **Auth**: Bearer Token
* **Request Body**:
```json
{
  "reason": "ASSISTED_ONBOARDING"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "callId": "call_1788111000_4444",
  "status": "RINGING",
  "message": "Saathi aapko +91 XXXXX 2428 par call kar raha hai. Kripya phone uthayein."
}
```

### `GET /api/omnidim/call/status/:callId`
Retrieves live status of an outbound callback.
* **Auth**: Bearer Token
* **Response (200 OK)**:
```json
{
  "success": true,
  "call": {
    "callId": "call_1788111000_4444",
    "phoneNumberMasked": "+91 XXXXX 2428",
    "status": "RINGING",
    "durationSeconds": 0
  }
}
```

