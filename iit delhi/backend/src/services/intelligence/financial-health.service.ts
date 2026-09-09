/**
 * Financial Health Score Service (Phase 3)
 * Non-credit explainable financial health score (0–100).
 * NOT a lender credit score — explicitly labeled as personal wellness metric.
 */

import { Account } from "../../models/Account";
import { Transaction } from "../../models/Transaction";
import { Loan } from "../../models/Loan";

export interface HealthDimension {
  name: string;
  score: number; // 0–100
  weight: number;
  explanation: string;
}

export interface FinancialHealthResult {
  overallScore: number;
  dimensions: HealthDimension[];
  disclaimer: string;
}

export class FinancialHealthService {
  public static async compute(userId: string): Promise<FinancialHealthResult> {
    const account = await Account.findOne({ userId });
    const loan = await Loan.findOne({ userId });
    const recentTxns = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(30);

    const dimensions: HealthDimension[] = [];

    // 1. Savings Buffer (balance relative to spending)
    const totalSpending = recentTxns
      .filter((t) => t.type === "DEBIT")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = account?.balance || 0;
    const savingsRatio = totalSpending > 0 ? balance / totalSpending : 1;
    const savingsScore = Math.min(100, Math.round(savingsRatio * 50));
    dimensions.push({
      name: "Savings Buffer",
      score: savingsScore,
      weight: 0.25,
      explanation:
        savingsScore > 70
          ? "Good savings buffer relative to recent spending."
          : "Your savings buffer is lower than your recent spending patterns.",
    });

    // 2. Debt Burden
    let debtScore = 100;
    if (loan && loan.status === "ACTIVE" && loan.remainingAmount > 0) {
      const debtRatio = loan.remainingAmount / Math.max(balance, 1);
      debtScore = Math.max(0, Math.round(100 - debtRatio * 30));
    }
    dimensions.push({
      name: "Debt Burden",
      score: debtScore,
      weight: 0.2,
      explanation:
        debtScore > 70
          ? "Your debt obligations are manageable."
          : "Outstanding loan balance is significant relative to your account balance.",
    });

    // 3. Spending Stability
    const debitAmounts = recentTxns.filter((t) => t.type === "DEBIT").map((t) => Math.abs(t.amount));
    let stabilityScore = 80;
    if (debitAmounts.length > 3) {
      const avg = debitAmounts.reduce((a, b) => a + b, 0) / debitAmounts.length;
      const variance = debitAmounts.reduce((s, v) => s + (v - avg) ** 2, 0) / debitAmounts.length;
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
      stabilityScore = Math.max(0, Math.round(100 - cv * 60));
    }
    dimensions.push({
      name: "Spending Stability",
      score: stabilityScore,
      weight: 0.2,
      explanation:
        stabilityScore > 70
          ? "Your spending patterns are consistent."
          : "Your spending amounts vary significantly — consider budgeting.",
    });

    // 4. Repayment Consistency
    let repayScore = 100;
    if (loan && loan.status !== "PAID") {
      repayScore = loan.paidAmount > 0 ? Math.min(100, Math.round((loan.paidAmount / loan.totalRepayable) * 120)) : 50;
    }
    dimensions.push({
      name: "Repayment Consistency",
      score: repayScore,
      weight: 0.2,
      explanation: repayScore > 70 ? "On track with loan repayments." : "Some EMIs may be pending.",
    });

    // 5. Emergency Reserve
    const emergencyScore = balance > 5000 ? 90 : balance > 2000 ? 60 : 30;
    dimensions.push({
      name: "Emergency Reserve",
      score: emergencyScore,
      weight: 0.15,
      explanation:
        emergencyScore > 70
          ? "You have a reasonable emergency buffer."
          : "Consider building an emergency fund of at least ₹5,000.",
    });

    // Weighted overall score
    const overallScore = Math.round(
      dimensions.reduce((s, d) => s + d.score * d.weight, 0)
    );

    return {
      overallScore,
      dimensions,
      disclaimer:
        "This is a personal financial wellness indicator, NOT a bank credit score. It is based on your recent activity in the Sahara demo environment.",
    };
  }
}
