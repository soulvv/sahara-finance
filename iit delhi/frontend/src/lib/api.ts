/**
 * Centralized API client for Sahara Finance.
 * Automatically manages Authorization headers, multipart uploads, and normalizes error responses.
 */

export interface ApiErrorPayload {
  success: false;
  code: string;
  message: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  [key: string]: unknown;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  data?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    extra?: { retryAfterSeconds?: number; attemptsRemaining?: number; data?: unknown }
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.attemptsRemaining = extra?.attemptsRemaining;
    this.data = extra?.data;
  }
}

const AUTH_TOKEN_KEY = "sahara-auth-token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    /* non-fatal */
  }
}

const BASE_API_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${BASE_API_URL}${cleanEndpoint}`;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set application/json when not using FormData (browser sets multipart boundary automatically)
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const targetUrl = buildUrl(endpoint);

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorPayload = data as ApiErrorPayload;
    throw new ApiError(
      response.status,
      errorPayload?.code || "HTTP_ERROR",
      errorPayload?.message || response.statusText || "Request failed",
      {
        retryAfterSeconds: errorPayload?.retryAfterSeconds,
        attemptsRemaining: errorPayload?.attemptsRemaining,
        data,
      }
    );
  }

  return data as T;
}

export const api = {
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

// ==========================================
// Specialized Phase 3 API Helper Methods
// ==========================================

export interface UserProfileResponse {
  success: boolean;
  user: {
    id: string;
    phone: string;
    name: string | null;
    preferredLanguage: "hi" | "hinglish" | "en";
    status: "ACTIVE" | "SUSPENDED" | "PENDING_KYC";
    onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
    createdAt?: string;
  };
}

export interface OnboardingStateResponse {
  success: boolean;
  onboarding: {
    currentStep: "STEP_0_NAME" | "STEP_1_PRIVACY" | "STEP_2_DOCUMENT" | "COMPLETED";
    completedSteps: string[];
    consentGiven: boolean;
    consentGivenAt?: string | null;
    kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
    completed: boolean;
  };
}

export interface KycVerifyResponse {
  success: boolean;
  kycStatus: "VERIFIED" | "FAILED" | "PENDING";
  documentType: "AADHAAR" | "VOTER_ID" | "PAN";
  verifiedName: string;
  maskedNumber: string;
  verifiedAt: string;
  disclaimer?: string;
}

export async function updateMyProfile(updates: {
  name?: string;
  preferredLanguage?: "hi" | "hinglish" | "en";
}): Promise<UserProfileResponse> {
  return api.patch<UserProfileResponse>("/api/users/me", updates);
}

export async function getOnboardingSession(): Promise<OnboardingStateResponse> {
  return api.get<OnboardingStateResponse>("/api/onboarding");
}

export async function updateOnboardingProgress(
  currentStep: "STEP_0_NAME" | "STEP_1_PRIVACY" | "STEP_2_DOCUMENT" | "COMPLETED"
): Promise<OnboardingStateResponse> {
  return api.patch<OnboardingStateResponse>("/api/onboarding/progress", { currentStep });
}

export async function submitPrivacyConsent(pledgeAccepted = true): Promise<{
  success: boolean;
  currentStep: string;
  consentGivenAt: string;
}> {
  return api.post("/api/onboarding/consent", { pledgeAccepted });
}

export async function verifyDemoKycDocument(
  documentType: "AADHAAR" | "VOTER_ID" | "PAN" = "AADHAAR",
  file?: File | Blob
): Promise<KycVerifyResponse> {
  const formData = new FormData();
  formData.append("documentType", documentType);
  if (file) {
    formData.append("file", file, (file as File).name || "document.jpg");
  }
  return api.post<KycVerifyResponse>("/api/kyc/verify-document", formData);
}

// ==========================================
// Specialized Phase 4 API Helper Methods
// ==========================================

export interface AccountBalanceResponse {
  success: boolean;
  account: {
    accountNumberMasked: string;
    balance: number;
    currency: string;
    status: "ACTIVE" | "FROZEN";
  };
  lastUpdated?: string;
}

export interface TransactionItem {
  id: string;
  referenceId: string;
  title: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: "MERCHANT_PAYMENT" | "RECHARGE" | "GOVT_BENEFIT" | "LOAN_EMI";
  status: "PENDING" | "SUCCESS" | "FAILED" | "REVERSED";
  date: string;
}

export interface RecentTransactionsResponse {
  success: boolean;
  transactions: TransactionItem[];
}

export async function getAccountBalance(): Promise<AccountBalanceResponse> {
  return api.get<AccountBalanceResponse>("/api/account/balance");
}

export async function getRecentTransactions(
  limit = 10
): Promise<RecentTransactionsResponse> {
  return api.get<RecentTransactionsResponse>(`/api/transactions/recent?limit=${limit}`);
}

// ==========================================
// Specialized Phase 5 API Helper Methods
// ==========================================

export interface MerchantItem {
  id: string;
  name: string;
  upiId: string;
  category: string;
  avatar?: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export interface PaymentIntent {
  paymentId: string;
  merchant: {
    id: string;
    name: string;
    upiId: string;
    category: string;
  };
  amount: number;
  currency: string;
  status: "INITIATED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  accountBalance?: number;
  estimatedRemainingBalance?: number;
  expiresAt: string;
}

export interface PaymentReceipt {
  paymentId: string;
  transactionId: string;
  referenceId: string;
  merchantName: string;
  merchantUpi: string;
  amount: number;
  currency: string;
  status: "COMPLETED";
  remainingBalance: number;
  completedAt: string;
  disclaimer: string;
}

export async function lookupMerchant(params: {
  upiId?: string;
  id?: string;
}): Promise<{ success: boolean; merchant: MerchantItem }> {
  const query = params.upiId
    ? `?upiId=${encodeURIComponent(params.upiId)}`
    : `?id=${encodeURIComponent(params.id || "")}`;
  return api.get<{ success: boolean; merchant: MerchantItem }>(
    `/api/merchants/lookup${query}`
  );
}

export async function listMerchants(): Promise<{
  success: boolean;
  merchants: MerchantItem[];
}> {
  return api.get<{ success: boolean; merchants: MerchantItem[] }>("/api/merchants");
}

export async function initiatePayment(params: {
  merchantId?: string;
  recipientUpi?: string;
  amount: number;
}): Promise<{ success: boolean; payment: PaymentIntent }> {
  return api.post<{ success: boolean; payment: PaymentIntent }>(
    "/api/payments/initiate",
    params
  );
}

export async function getPaymentDetails(
  paymentId: string
): Promise<{ success: boolean; payment: PaymentIntent }> {
  return api.get<{ success: boolean; payment: PaymentIntent }>(
    `/api/payments/${paymentId}`
  );
}

export async function executePayment(params: {
  paymentId: string;
  idempotencyKey: string;
}): Promise<{
  success: boolean;
  duplicate?: boolean;
  payment: {
    paymentId: string;
    status: string;
    transactionId: string;
    referenceId: string;
    remainingBalance: number;
  };
}> {
  return api.post("/api/payments/execute", params);
}

export async function getPaymentReceipt(
  paymentId: string
): Promise<{ success: boolean; receipt: PaymentReceipt }> {
  return api.get<{ success: boolean; receipt: PaymentReceipt }>(
    `/api/payments/${paymentId}/receipt`
  );
}

// ==========================================
// Specialized Phase 6 API Helper Methods
// ==========================================

export interface LoanData {
  loanId: string;
  loanNumber: string;
  principalAmount: number;
  interestAmount: number;
  totalRepayable: number;
  paidAmount: number;
  remainingAmount: number;
  monthlyEmi: number;
  durationMonths: number;
  repaidPercent: number;
  nextDueDate: string | null;
  status: "ACTIVE" | "PAID" | "CANCELLED";
}

export interface LoanRepaymentItem {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: "PAID" | "DUE" | "UPCOMING";
  paidAt?: string | null;
}

export interface SupportTicketItem {
  ticketId: string;
  category: string;
  reportedIssue: string;
  status: "IN_REVIEW" | "RESOLVED" | "REJECTED";
  estimatedResolutionTime: string;
  createdAt: string;
}

export async function getActiveLoan(): Promise<{
  success: boolean;
  loan: LoanData;
}> {
  return api.get<{ success: boolean; loan: LoanData }>("/api/loans/active");
}

export async function getLoanRepayments(
  loanId: string
): Promise<{ success: boolean; repayments: LoanRepaymentItem[] }> {
  return api.get<{ success: boolean; repayments: LoanRepaymentItem[] }>(
    `/api/loans/${loanId}/repayments`
  );
}

export async function repayNextEmi(
  loanId: string,
  idempotencyKey?: string
): Promise<{
  success: boolean;
  loan: {
    loanId: string;
    paidAmount: number;
    remainingAmount: number;
    repaidPercent: number;
    status: string;
  };
  repayment: {
    installmentNumber: number;
    amount: number;
    status: string;
    paidAt: string;
  };
  transaction: {
    transactionId: string;
    referenceId: string;
    amount: number;
    remainingBalance: number;
  };
}> {
  return api.post(`/api/loans/${loanId}/repay`, { idempotencyKey });
}

export async function createSupportTicket(params: {
  category: string;
  transactionId?: string;
  reportedIssue: string;
  recordedViaVoice?: boolean;
}): Promise<{
  success: boolean;
  ticket: SupportTicketItem;
}> {
  return api.post<{ success: boolean; ticket: SupportTicketItem }>(
    "/api/assistance/tickets",
    params
  );
}

export async function getSupportTicket(
  ticketId: string
): Promise<{ success: boolean; ticket: SupportTicketItem }> {
  return api.get<{ success: boolean; ticket: SupportTicketItem }>(
    `/api/assistance/tickets/${ticketId}`
  );
}

export async function getUserTickets(
  limit = 10
): Promise<{ success: boolean; tickets: SupportTicketItem[] }> {
  return api.get<{ success: boolean; tickets: SupportTicketItem[] }>(
    `/api/assistance/tickets?limit=${limit}`
  );
}

// ==========================================
// PHASE 7: OMNIDIMENSION AI & ASSISTANCE APIS
// ==========================================

export interface WebVoiceSession {
  sessionId: string;
  wsUrl: string;
  expiresInSeconds: number;
  agentId: string;
}

export interface WebsiteAction<T = any> {
  actionId: string;
  type: string;
  payload: T;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresConfirmation: boolean;
  userPromptMessage?: string;
  confirmed?: boolean;
  executed?: boolean;
}

export interface ChatMessageResponse {
  success: boolean;
  reply: string;
  actions: WebsiteAction[];
  intent?: string;
  sessionId?: string;
}

export interface PhoneCallResponse {
  success: boolean;
  callId: string;
  providerCallId: string;
  status: string;
  message: string;
}

export async function createVoiceSession(context?: {
  language?: string;
  currentRoute?: string;
}): Promise<{ success: boolean; session: WebVoiceSession }> {
  return api.post("/api/omnidim/session/voice", context || {});
}

export async function sendChatMessage(
  message: string,
  context?: {
    language?: string;
    currentRoute?: string;
    onboardingStatus?: string;
  }
): Promise<ChatMessageResponse> {
  return api.post("/api/omnidim/chat", {
    message,
    language: context?.language,
    context,
  });
}

export async function requestPhoneCall(
  reason = "ASSISTED_ONBOARDING",
  context?: Record<string, any>,
  phoneNumber?: string,
  name?: string,
  isLoginCall?: boolean
): Promise<PhoneCallResponse & { loginAuthToken?: string; user?: any }> {
  return api.post("/api/omnidim/call/request", {
    reason,
    context,
    phoneNumber,
    name,
    isLoginCall,
  });
}

export interface CallLoginResult {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    preferredLanguage: "hi" | "hinglish" | "en";
    onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  };
  nextRoute: "/onboarding" | "/dashboard";
  callId?: string;
  channel: string;
}

export async function completeCallLogin(
  callId?: string,
  phone?: string,
  name?: string
): Promise<CallLoginResult> {
  return api.post("/api/auth/call-login-complete", {
    callId,
    phone,
    name,
  });
}

export async function getPhoneCallStatus(
  callId: string
): Promise<{
  success: boolean;
  call: {
    callId: string;
    phoneNumberMasked: string;
    rawPhoneNumber?: string;
    status: string;
    reason: string;
    isLoginCall?: boolean;
    capturedName?: string | null;
    loginAuthToken?: string | null;
    callAuthStatus?: "PENDING" | "AUTHENTICATED" | "FAILED";
    user?: any;
    durationSeconds?: number;
    createdAt: string;
  };
}> {
  return api.get(`/api/omnidim/call/status/${callId}`);
}

export async function confirmAiAction(params: {
  actionId: string;
  confirmed: boolean;
  actionType: string;
  payload: Record<string, any>;
}): Promise<{
  success: boolean;
  message: string;
  updatedUser?: any;
}> {
  return api.post("/api/omnidim/actions/confirm", params);
}

export async function getOmnidimStatus(): Promise<{
  success: boolean;
  service: string;
  mode: string;
  isConfigured: boolean;
  agent: string;
  supportedChannels: string[];
}> {
  return api.get("/api/omnidim/status");
}



