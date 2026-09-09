/**
 * Fraud Dispute Service (Phase 4)
 * Allows users to report suspicious transactions and track dispute resolution.
 */

export interface FraudDispute {
  id: string;
  userId: string;
  transactionId: string;
  amount: number;
  reason: string;
  details?: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  slaDeadline: string; // 48-hour resolution SLA
  createdAt: string;
  updatedAt: string;
}

const disputesStore = new Map<string, FraudDispute[]>();
let disputeCounter = 1001;

export class DisputeService {
  public static create(
    userId: string,
    params: { transactionId: string; amount: number; reason: string; details?: string }
  ): FraudDispute {
    const userDisputes = disputesStore.get(userId) || [];
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    const dispute: FraudDispute = {
      id: `DISP-${disputeCounter++}`,
      userId,
      transactionId: params.transactionId,
      amount: params.amount,
      reason: params.reason,
      details: params.details,
      status: "SUBMITTED",
      slaDeadline,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    userDisputes.unshift(dispute);
    disputesStore.set(userId, userDisputes);
    return dispute;
  }

  public static getDisputes(userId: string): FraudDispute[] {
    return disputesStore.get(userId) || [];
  }

  public static getDisputeById(userId: string, disputeId: string): FraudDispute | null {
    const userDisputes = disputesStore.get(userId) || [];
    return userDisputes.find((d) => d.id === disputeId) || null;
  }
}
