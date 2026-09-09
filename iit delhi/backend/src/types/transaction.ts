export type TransactionType = "DEBIT" | "CREDIT";
export type TransactionCategory =
  | "MERCHANT_PAYMENT"
  | "RECHARGE"
  | "GOVT_BENEFIT"
  | "LOAN_EMI";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REVERSED";

export interface ITransaction {
  _id: string;
  accountId: string;
  userId: string;
  referenceId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  title: string;
  description?: string | null;
  recipientName?: string | null;
  recipientUpiId?: string | null;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}
