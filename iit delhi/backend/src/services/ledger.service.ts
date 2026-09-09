import { Account, AccountDocument } from "../models/Account";
import { Transaction, TransactionDocument } from "../models/Transaction";
import { TransactionCategory } from "../types/transaction";

export interface DebitTransactionParams {
  accountId: string;
  userId: string;
  amount: number;
  title: string;
  category?: TransactionCategory;
  referenceId: string;
  recipientName?: string;
  recipientUpiId?: string;
}

export class LedgerService {
  /**
   * Atomically debits an account if balance is sufficient and records a transaction.
   * This is the single source of truth for balance mutations.
   */
  async executeDebitTransaction(
    params: DebitTransactionParams
  ): Promise<{
    updatedAccount: AccountDocument;
    transaction: TransactionDocument;
  }> {
    const {
      accountId,
      userId,
      amount,
      title,
      category = "MERCHANT_PAYMENT",
      referenceId,
      recipientName,
      recipientUpiId,
    } = params;

    // 1. Ensure amount is positive
    const debitAmount = Math.abs(amount);
    if (debitAmount <= 0) {
      throw {
        status: 400,
        code: "INVALID_AMOUNT",
        message: "Debit amount must be greater than 0.",
      };
    }

    // 2. Perform atomic conditional update: balance must be >= debitAmount
    const updatedAccount = await Account.findOneAndUpdate(
      {
        _id: accountId,
        userId,
        balance: { $gte: debitAmount },
        status: "ACTIVE",
      },
      {
        $inc: { balance: -debitAmount },
      },
      {
        new: true,
      }
    );

    // 3. Handle failure scenarios
    if (!updatedAccount) {
      const currentAccount = await Account.findOne({ _id: accountId, userId });
      if (!currentAccount) {
        throw {
          status: 404,
          code: "ACCOUNT_NOT_FOUND",
          message: "User account could not be found.",
        };
      }
      if (currentAccount.status !== "ACTIVE") {
        throw {
          status: 403,
          code: "ACCOUNT_INACTIVE",
          message: "Account is not active.",
        };
      }
      // Balance was insufficient
      throw {
        status: 422,
        code: "INSUFFICIENT_BALANCE",
        message: "There is not enough balance for this payment.",
        availableBalance: currentAccount.balance,
      };
    }

    // 4. Create Transaction record in the ledger
    const transaction = await Transaction.create({
      accountId,
      userId,
      referenceId,
      type: "DEBIT",
      category,
      amount: -debitAmount,
      title,
      recipientName,
      recipientUpiId,
      status: "SUCCESS",
      createdAt: new Date(),
    });

    return {
      updatedAccount,
      transaction,
    };
  }
}

export const ledgerService = new LedgerService();
