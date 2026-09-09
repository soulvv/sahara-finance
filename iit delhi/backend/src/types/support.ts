export type TicketCategory =
  | "FAILED_PAYMENT"
  | "PAYMENT_DISPUTE"
  | "ACCOUNT_HELP"
  | "LOAN_HELP"
  | "KYC_HELP"
  | "OTHER";

export type TicketStatus = "IN_REVIEW" | "RESOLVED" | "REJECTED";

export interface ISupportTicket {
  _id: string;
  ticketNumber: string;
  userId: string;
  relatedTransactionId?: string | null;
  category: TicketCategory;
  reportedIssue: string;
  recordedViaVoice: boolean;
  status: TicketStatus;
  resolutionSlaHours: number;
  estimatedResolutionTime: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}
