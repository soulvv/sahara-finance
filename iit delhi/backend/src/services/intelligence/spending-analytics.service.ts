/**
 * Spending Analytics Service (Phase 3)
 * Income, spending, top categories, month-over-month, largest transaction.
 */

import { Transaction } from "../../models/Transaction";
import { CategorizationService } from "./categorization.service";

export interface SpendingAnalytics {
  totalIncome: number;
  totalSpending: number;
  netSavings: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  largestTransaction: { title: string; amount: number; date: string } | null;
  transactionCount: number;
  insights: string[];
}

export class SpendingAnalyticsService {
  public static async compute(userId: string, daysBack: number = 30): Promise<SpendingAnalytics> {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const txns = await Transaction.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 });

    let totalIncome = 0;
    let totalSpending = 0;
    const categoryTotals = new Map<string, number>();
    let largest: { title: string; amount: number; date: string } | null = null;

    for (const tx of txns) {
      const absAmount = Math.abs(tx.amount);
      if (tx.type === "CREDIT") {
        totalIncome += absAmount;
      } else {
        totalSpending += absAmount;
        const cat = CategorizationService.getCategory(userId, tx.referenceId, tx.title, tx.description || "");
        categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + absAmount);

        if (!largest || absAmount > largest.amount) {
          largest = { title: tx.title, amount: absAmount, date: tx.createdAt.toISOString() };
        }
      }
    }

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const netSavings = totalIncome - totalSpending;
    const insights: string[] = [];

    if (topCategories.length > 0) {
      insights.push(`Your top spending category is ${topCategories[0].category} at ${topCategories[0].percentage}% of total spending.`);
    }
    if (netSavings > 0) {
      insights.push(`You saved ₹${netSavings.toFixed(0)} this period. Keep it up!`);
    } else if (netSavings < 0) {
      insights.push(`Your spending exceeded income by ₹${Math.abs(netSavings).toFixed(0)}. Consider reviewing expenses.`);
    }

    return {
      totalIncome,
      totalSpending,
      netSavings,
      topCategories,
      largestTransaction: largest,
      transactionCount: txns.length,
      insights,
    };
  }
}
