export type PaymentStatus =
  | "INITIATED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface IPayment {
  _id: string;
  userId: string;
  accountId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey?: string | null;
  referenceId?: string | null;
  transactionId?: string | null;
  expiresAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
