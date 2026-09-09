export type OnboardingStep =
  | "STEP_0_NAME"
  | "STEP_1_PRIVACY"
  | "STEP_2_DOCUMENT"
  | "COMPLETED";

export interface IOnboardingSession {
  _id: string;
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  consentGivenAt?: Date | null;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: string;
  userId: string;
  event: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
