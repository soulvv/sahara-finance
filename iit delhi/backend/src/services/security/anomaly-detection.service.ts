/**
 * Transaction Anomaly Detection Service (Phase 4)
 * Evaluates transactions against user historical patterns for anomalies.
 */

import { Transaction } from "../../models/Transaction";

export interface AnomalyResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  anomalyScore: number;
  factors: string[];
  normalRange: { min: number; max: number };
}

export class AnomalyDetectionService {
  public static async evaluate(userId: string, amount: number, recipientUpi?: string): Promise<AnomalyResult> {
    const recentTxns = await Transaction.find({ userId, type: "DEBIT" })
      .sort({ createdAt: -1 })
      .limit(30);

    const amounts = recentTxns.map((t) => Math.abs(t.amount));
    const factors: string[] = [];
    let score = 0;

    // 1. Amount deviation from historical average
    if (amounts.length > 0) {
      const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const max = Math.max(...amounts);
      const min = Math.min(...amounts);

      if (amount > avg * 5) {
        score += 40;
        factors.push(`Amount ₹${amount} is 5x your average transaction of ₹${Math.round(avg)}.`);
      } else if (amount > avg * 3) {
        score += 20;
        factors.push(`Amount ₹${amount} exceeds 3x your average of ₹${Math.round(avg)}.`);
      }

      // 2. New recipient check
      if (recipientUpi) {
        const knownRecipients = new Set(recentTxns.map((t) => t.recipientUpiId).filter(Boolean));
        if (!knownRecipients.has(recipientUpi)) {
          score += 25;
          factors.push("First-time transaction to this recipient.");
        }
      }

      // 3. Rapid transaction velocity (more than 5 in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentHourCount = recentTxns.filter((t) => t.createdAt > oneHourAgo).length;
      if (recentHourCount >= 5) {
        score += 30;
        factors.push(`${recentHourCount} transactions in the last hour — unusual velocity.`);
      }

      const normalRange = { min: Math.round(min), max: Math.round(max) };
      const riskLevel: "LOW" | "MEDIUM" | "HIGH" = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

      return { riskLevel, anomalyScore: Math.min(100, score), factors, normalRange };
    }

    return { riskLevel: "LOW", anomalyScore: 0, factors: ["No transaction history to compare against."], normalRange: { min: 0, max: 0 } };
  }
}
