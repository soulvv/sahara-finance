export type LoanStatus = "ACTIVE" | "PAID" | "CANCELLED";
export type RepaymentStatus = "PAID" | "DUE" | "UPCOMING";

export interface ILoan {
  _id: string;
  userId: string;
  loanNumber: string;
  principalAmount: number;
  interestAmount: number;
  totalRepayable: number;
  paidAmount: number;
  remainingAmount: number;
  durationMonths: number;
  monthlyEmi: number;
  status: LoanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanRepayment {
  _id: string;
  loanId: string;
  userId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: RepaymentStatus;
  paidAt?: Date | null;
  transactionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
