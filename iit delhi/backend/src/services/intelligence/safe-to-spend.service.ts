/**
 * Safe-to-Spend Service (Phase 3 — Financial Intelligence)
 *
 * Deterministic computation: SafeToSpend = Balance - (EMI + Bills + Savings + Emergency)
 * Never uses AI to calculate financial values.
 */

import { Account } from "../../models/Account";
import { Loan } from "../../models/Loan";
import { LoanRepayment } from "../../models/LoanRepayment";

export interface SafeToSpendResult {
  totalBalance: number;
  safeToSpend: number;
  reservedTotal: number;
  reservedBreakdown: { label: string; amount: number }[];
  currency: string;
}

export class SafeToSpendService {
  /**
   * Compute safe-to-spend for authenticated user from backend-verified data.
   */
  public static async compute(userId: string): Promise<SafeToSpendResult> {
    const account = await Account.findOne({ userId });
    if (!account) {
      throw { status: 404, code: "ACCOUNT_NOT_FOUND", message: "No account found." };
    }

    const totalBalance = account.balance;
    const reserved: { label: string; amount: number }[] = [];

    // 1. Upcoming EMI obligations
    const activeLoan = await Loan.findOne({ userId, status: "ACTIVE" });
    if (activeLoan) {
      const nextDue = await LoanRepayment.findOne({
        loanId: activeLoan._id,
        userId,
        status: { $in: ["DUE", "UPCOMING"] },
      }).sort({ installmentNumber: 1 });

      if (nextDue) {
        reserved.push({ label: "Upcoming EMI", amount: nextDue.amount });
      }
    }

    // 2. Simulated recurring bills (demo data)
    reserved.push({ label: "Electricity bill (est.)", amount: 1200 });
    reserved.push({ label: "Emergency reserve", amount: 2600 });

    const reservedTotal = reserved.reduce((sum, r) => sum + r.amount, 0);
    const safeToSpend = Math.max(0, totalBalance - reservedTotal);

    return {
      totalBalance,
      safeToSpend,
      reservedTotal,
      reservedBreakdown: reserved,
      currency: account.currency || "INR",
    };
  }
}
