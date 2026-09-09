/**
 * What-If Financial Simulator (Phase 3)
 * Backend-computed scenarios — AI only explains results, never invents them.
 */

import { Account } from "../../models/Account";
import { Loan } from "../../models/Loan";

export interface SimulationResult {
  scenario: string;
  currentBalance: number;
  projectedBalance: number;
  projectedMonthlySavings: number;
  impact: string;
  riskAssessment: "LOW" | "MODERATE" | "HIGH";
}

export class SimulatorService {
  /**
   * Run a what-if financial scenario using verified backend data.
   */
  public static async simulate(
    userId: string,
    params: { type: string; amount: number; months?: number }
  ): Promise<SimulationResult> {
    const account = await Account.findOne({ userId });
    const loan = await Loan.findOne({ userId, status: "ACTIVE" });
    const balance = account?.balance || 0;
    const { type, amount, months = 6 } = params;

    let projectedBalance = balance;
    let projectedMonthlySavings = 0;
    let impact = "";
    let risk: "LOW" | "MODERATE" | "HIGH" = "LOW";

    switch (type.toUpperCase()) {
      case "BORROW": {
        const interestRate = 0.12; // 12% annual
        const monthlyRate = interestRate / 12;
        const emi =
          amount > 0 && months > 0
            ? Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1))
            : 0;
        const totalRepayable = emi * months;
        const totalInterest = totalRepayable - amount;
        const existingEmi = loan?.monthlyEmi || 0;

        projectedBalance = balance + amount;
        projectedMonthlySavings = -(emi + existingEmi);
        impact = `Borrowing ₹${amount} at 12% for ${months} months: EMI ₹${emi}/month, total interest ₹${totalInterest}, total repayment ₹${totalRepayable}.`;
        risk = (emi + existingEmi) > balance * 0.4 ? "HIGH" : emi > 2000 ? "MODERATE" : "LOW";
        break;
      }

      case "SAVE_MORE": {
        projectedBalance = balance + amount * months;
        projectedMonthlySavings = amount;
        impact = `Saving ₹${amount}/month for ${months} months builds ₹${amount * months} total savings. Projected balance: ₹${projectedBalance}.`;
        risk = "LOW";
        break;
      }

      case "INCOME_DECREASE": {
        projectedBalance = balance - amount * months;
        projectedMonthlySavings = -amount;
        impact = `If income drops by ₹${amount}/month, your balance could reduce to ₹${Math.max(0, projectedBalance)} in ${months} months.`;
        risk = projectedBalance < 2000 ? "HIGH" : projectedBalance < 5000 ? "MODERATE" : "LOW";
        break;
      }

      case "EXTRA_EMI": {
        if (loan && loan.remainingAmount > 0) {
          const newRemaining = Math.max(0, loan.remainingAmount - amount);
          const savedInterest = Math.round(amount * 0.12 / 12 * (loan.durationMonths || 3));
          projectedBalance = balance - amount;
          impact = `Extra ₹${amount} repayment reduces outstanding to ₹${newRemaining}. Estimated interest saved: ₹${savedInterest}.`;
          risk = projectedBalance < 1000 ? "MODERATE" : "LOW";
        } else {
          impact = "No active loan to make extra repayment on.";
        }
        break;
      }

      default:
        impact = `Unknown scenario type: ${type}`;
    }

    return {
      scenario: type,
      currentBalance: balance,
      projectedBalance: Math.max(0, projectedBalance),
      projectedMonthlySavings,
      impact,
      riskAssessment: risk,
    };
  }
}

/**
 * Loan Simulator — Interactive comparison of loan options.
 */
export class LoanSimulatorService {
  public static simulate(params: { amount: number; tenureMonths: number; annualRate: number }) {
    const { amount, tenureMonths, annualRate } = params;
    const monthlyRate = annualRate / 100 / 12;
    const emi =
      monthlyRate > 0
        ? Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
        : Math.round(amount / tenureMonths);

    const totalRepayable = emi * tenureMonths;
    const totalInterest = totalRepayable - amount;

    return {
      principal: amount,
      tenureMonths,
      annualRate,
      monthlyEmi: emi,
      totalInterest,
      totalRepayable,
      disclaimer: "This is a simulation for educational purposes. It does not constitute a loan offer or approval.",
    };
  }
}
