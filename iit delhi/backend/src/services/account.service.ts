import { User } from "../models/User";
import { Account, AccountDocument } from "../models/Account";
import { Transaction } from "../models/Transaction";

export class AccountService {
  /**
   * Ensures a demo account exists for the user and initializes demo transactions if needed.
   */
  async ensureAccountForUser(userId: string): Promise<AccountDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, code: "USER_NOT_FOUND", message: "User account not found." };
    }

    let account = await Account.findOne({ userId });
    if (!account) {
      const random4 = Math.floor(1000 + Math.random() * 9000).toString();
      account = await Account.create({
        userId,
        accountNumberMasked: `XXXX XXXX ${random4}`,
        balance: 8420.0,
        currency: "INR",
        status: "ACTIVE",
      });

      // Seed initial 4 realistic demo transactions
      const now = Date.now();
      const initialTransactions = [
        {
          accountId: account._id,
          userId,
          referenceId: `SAH-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          type: "DEBIT",
          category: "MERCHANT_PAYMENT",
          amount: -500.0,
          title: "Rahul General Store",
          description: "Grocery purchase via QR",
          recipientName: "Rahul General Store",
          status: "SUCCESS",
          createdAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          accountId: account._id,
          userId,
          referenceId: `SAH-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          type: "DEBIT",
          category: "RECHARGE",
          amount: -199.0,
          title: "Mobile recharge",
          description: "28-day prepaid recharge",
          status: "SUCCESS",
          createdAt: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          accountId: account._id,
          userId,
          referenceId: `SAH-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          type: "CREDIT",
          category: "GOVT_BENEFIT",
          amount: 2000.0,
          title: "Government benefit",
          description: "DBT Direct Benefit Transfer",
          status: "SUCCESS",
          createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        },
        {
          accountId: account._id,
          userId,
          referenceId: `SAH-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          type: "DEBIT",
          category: "LOAN_EMI",
          amount: -1800.0,
          title: "Loan payment",
          description: "Monthly micro-enterprise EMI",
          status: "SUCCESS",
          createdAt: new Date(now - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        },
      ];

      await Transaction.insertMany(initialTransactions);
    }

    return account;
  }

  /**
   * Retrieves the current balance for an authenticated user.
   */
  async getBalanceForUser(userId: string) {
    const account = await this.ensureAccountForUser(userId);
    return {
      accountNumberMasked: account.accountNumberMasked,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
      lastUpdated: account.updatedAt || new Date(),
    };
  }
}

export const accountService = new AccountService();
