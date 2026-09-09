import { Loan, LoanDocument } from "../models/Loan";
import { LoanRepayment, LoanRepaymentDocument } from "../models/LoanRepayment";
import { accountService } from "./account.service";
import { ledgerService } from "./ledger.service";

export class LoanService {
  /**
   * Bootstraps a demo micro-loan and its 3-installment repayment schedule.
   */
  async ensureDemoLoan(userId: string): Promise<LoanDocument> {
    let loan = await Loan.findOne({ userId });
    if (!loan) {
      loan = await Loan.create({
        userId,
        loanNumber: "LN-501",
        principalAmount: 5000,
        interestAmount: 400,
        totalRepayable: 5400,
        paidAmount: 3600,
        remainingAmount: 1800,
        durationMonths: 3,
        monthlyEmi: 1800,
        status: "ACTIVE",
      });

      const now = Date.now();
      const repayments = [
        {
          loanId: loan._id,
          userId,
          installmentNumber: 1,
          amount: 1800,
          dueDate: new Date(now - 30 * 24 * 60 * 60 * 1000),
          status: "PAID",
          paidAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
        },
        {
          loanId: loan._id,
          userId,
          installmentNumber: 2,
          amount: 1800,
          dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
          status: "PAID",
          paidAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        },
        {
          loanId: loan._id,
          userId,
          installmentNumber: 3,
          amount: 1800,
          dueDate: new Date(now + 12 * 24 * 60 * 60 * 1000),
          status: "DUE",
          paidAt: null,
        },
      ];

      await LoanRepayment.insertMany(repayments);
    }

    return loan;
  }

  /**
   * Retrieves active loan information for the authenticated user.
   */
  async getActiveLoan(userId: string) {
    const loan = await this.ensureDemoLoan(userId);

    const nextDueRepayment = await LoanRepayment.findOne({
      loanId: loan._id,
      status: { $in: ["DUE", "UPCOMING"] },
    }).sort({ installmentNumber: 1 });

    const repaidPercent =
      loan.totalRepayable > 0
        ? Math.min(Math.round((loan.paidAmount / loan.totalRepayable) * 100), 100)
        : 100;

    return {
      loanId: loan._id.toString(),
      loanNumber: loan.loanNumber,
      principalAmount: loan.principalAmount,
      interestAmount: loan.interestAmount,
      totalRepayable: loan.totalRepayable,
      paidAmount: loan.paidAmount,
      remainingAmount: loan.remainingAmount,
      monthlyEmi: loan.monthlyEmi,
      durationMonths: loan.durationMonths,
      repaidPercent,
      nextDueDate: nextDueRepayment
        ? nextDueRepayment.dueDate.toISOString().split("T")[0]
        : null,
      status: loan.status,
    };
  }

  /**
   * Retrieves details of a specific loan.
   */
  async getLoan(userId: string, loanId: string) {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw { status: 404, code: "LOAN_NOT_FOUND", message: "Loan not found." };
    }

    if (loan.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view this loan.",
      };
    }

    const nextDueRepayment = await LoanRepayment.findOne({
      loanId: loan._id,
      status: { $in: ["DUE", "UPCOMING"] },
    }).sort({ installmentNumber: 1 });

    const repaidPercent =
      loan.totalRepayable > 0
        ? Math.min(Math.round((loan.paidAmount / loan.totalRepayable) * 100), 100)
        : 100;

    return {
      loanId: loan._id.toString(),
      loanNumber: loan.loanNumber,
      principalAmount: loan.principalAmount,
      interestAmount: loan.interestAmount,
      totalRepayable: loan.totalRepayable,
      paidAmount: loan.paidAmount,
      remainingAmount: loan.remainingAmount,
      monthlyEmi: loan.monthlyEmi,
      durationMonths: loan.durationMonths,
      repaidPercent,
      nextDueDate: nextDueRepayment
        ? nextDueRepayment.dueDate.toISOString().split("T")[0]
        : null,
      status: loan.status,
    };
  }

  /**
   * Retrieves repayment schedule installments for a loan.
   */
  async getLoanRepayments(userId: string, loanId: string) {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw { status: 404, code: "LOAN_NOT_FOUND", message: "Loan not found." };
    }

    if (loan.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view these repayments.",
      };
    }

    const repayments = await LoanRepayment.find({ loanId }).sort({
      installmentNumber: 1,
    });

    return repayments.map((r) => ({
      id: r._id.toString(),
      installmentNumber: r.installmentNumber,
      amount: r.amount,
      dueDate: r.dueDate.toISOString().split("T")[0],
      status: r.status,
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    }));
  }

  /**
   * Executes atomic payment for the next due EMI installment.
   */
  async repayNextEmi(userId: string, loanId: string, _idempotencyKey?: string) {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      throw { status: 404, code: "LOAN_NOT_FOUND", message: "Loan not found." };
    }

    if (loan.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to repay this loan.",
      };
    }

    if (loan.status === "PAID" || loan.remainingAmount <= 0) {
      throw {
        status: 400,
        code: "LOAN_ALREADY_PAID",
        message: "This loan has already been fully repaid.",
      };
    }

    // Find next unpaid installment
    const nextInstallment = await LoanRepayment.findOne({
      loanId: loan._id,
      status: { $in: ["DUE", "UPCOMING"] },
    }).sort({ installmentNumber: 1 });

    if (!nextInstallment) {
      loan.status = "PAID";
      loan.remainingAmount = 0;
      await loan.save();
      throw {
        status: 400,
        code: "LOAN_ALREADY_PAID",
        message: "No pending installments left for this loan.",
      };
    }

    const account = await accountService.ensureAccountForUser(userId);

    // 1. Atomically debit account via internal ledger
    const referenceId = `SAH-EMI-${Math.floor(1000 + Math.random() * 9000)}`;
    const { updatedAccount, transaction } =
      await ledgerService.executeDebitTransaction({
        accountId: account._id.toString(),
        userId,
        amount: nextInstallment.amount,
        title: `Loan EMI #${nextInstallment.installmentNumber}`,
        category: "LOAN_EMI",
        referenceId,
        recipientName: "Sahara Micro-Credit",
        recipientUpiId: "sahara.credit@upi",
      });

    // 2. Mark installment as PAID
    nextInstallment.status = "PAID";
    nextInstallment.paidAt = new Date();
    nextInstallment.transactionId = transaction._id as any;
    await nextInstallment.save();

    // 3. Update loan totals
    loan.paidAmount += nextInstallment.amount;
    loan.remainingAmount = Math.max(loan.remainingAmount - nextInstallment.amount, 0);
    if (loan.remainingAmount <= 0) {
      loan.status = "PAID";
    }
    await loan.save();

    const repaidPercent =
      loan.totalRepayable > 0
        ? Math.min(Math.round((loan.paidAmount / loan.totalRepayable) * 100), 100)
        : 100;

    return {
      success: true,
      loan: {
        loanId: loan._id.toString(),
        loanNumber: loan.loanNumber,
        paidAmount: loan.paidAmount,
        remainingAmount: loan.remainingAmount,
        repaidPercent,
        status: loan.status,
      },
      repayment: {
        installmentNumber: nextInstallment.installmentNumber,
        amount: nextInstallment.amount,
        status: "PAID",
        paidAt: nextInstallment.paidAt.toISOString(),
      },
      transaction: {
        transactionId: transaction._id.toString(),
        referenceId,
        amount: transaction.amount,
        remainingBalance: updatedAccount.balance,
      },
    };
  }
}

export const loanService = new LoanService();
