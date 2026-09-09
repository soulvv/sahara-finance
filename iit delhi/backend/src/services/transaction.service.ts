import { Transaction } from "../models/Transaction";
import { accountService } from "./account.service";

export class TransactionService {
  /**
   * Retrieves recent transactions for an authenticated user with pagination/limit.
   */
  async getRecentTransactions(userId: string, requestedLimit?: unknown) {
    // 1. Ensure user has demo account bootstrap completed
    await accountService.ensureAccountForUser(userId);

    // 2. Validate and clamp limit parameter
    let limit = 10;
    if (requestedLimit !== undefined && requestedLimit !== null) {
      const parsed = Number(requestedLimit);
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        throw {
          status: 400,
          code: "INVALID_LIMIT",
          message: "Transaction limit must be a positive integer between 1 and 50.",
        };
      }
      limit = Math.min(Math.max(parsed, 1), 50);
    }

    // 3. Fetch user's transactions only, sorted by newest first
    const txs = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return txs.map((tx) => ({
      id: tx._id.toString(),
      referenceId: tx.referenceId,
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      status: tx.status,
      date: tx.createdAt.toISOString(),
    }));
  }
}

export const transactionService = new TransactionService();
