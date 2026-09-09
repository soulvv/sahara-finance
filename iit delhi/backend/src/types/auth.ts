export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_KYC";
export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type KYCStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type PreferredLanguage = "hi" | "hinglish" | "en";

export interface IUser {
  _id: string;
  phone: string;
  name?: string | null;
  preferredLanguage: PreferredLanguage;
  status: UserStatus;
  onboardingStatus: OnboardingStatus;
  kycStatus: KYCStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOTP {
  _id: string;
  phone: string;
  otpHash: string;
  requestId: string;
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface JWTPayload {
  sub: string;
  phone: string;
  iat?: number;
  exp?: number;
}

export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  requestId: string;
  retryAfterSeconds: number;
  expiresInSeconds: number;
  otpLength: number;
  demoOtp?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  requestId: string;
  name?: string | null;
}

export interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    preferredLanguage: PreferredLanguage;
    onboardingStatus: OnboardingStatus;
    kycStatus: KYCStatus;
  };
  nextRoute: "/onboarding" | "/dashboard";
}

export interface CallLoginRequest {
  callId: string;
  phone?: string;
  name?: string;
}

export interface CallLoginResponse extends VerifyOtpResponse {
  callId: string;
  channel: "VOICE_CALL";
}
