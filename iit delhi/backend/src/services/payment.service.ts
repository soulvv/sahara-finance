import { Payment, PaymentDocument } from "../models/Payment";
import { accountService } from "./account.service";
import { merchantService } from "./merchant.service";
import { ledgerService } from "./ledger.service";

export interface InitiatePaymentParams {
  merchantId?: string;
  recipientUpi?: string;
  amount: number;
}

export interface ExecutePaymentParams {
  paymentId: string;
  idempotencyKey: string;
}

export class PaymentService {
  /**
   * Initiates a payment intent with server-side validation and balance check.
   */
  async initiatePayment(userId: string, params: InitiatePaymentParams) {
    const { merchantId, recipientUpi, amount } = params;

    // 1. Amount validation (Min ₹1, Max ₹50,000)
    const numericAmount = Number(amount);
    if (
      isNaN(numericAmount) ||
      !isFinite(numericAmount) ||
      numericAmount < 1 ||
      numericAmount > 50000
    ) {
      throw {
        status: 400,
        code: "INVALID_AMOUNT",
        message: "Payment amount must be between ₹1 and ₹50,000.",
      };
    }

    // 2. Resolve merchant
    const merchant = await merchantService.lookupMerchant({
      id: merchantId,
      upiId: recipientUpi,
    });

    // 3. Ensure user has an active account
    const account = await accountService.ensureAccountForUser(userId);
    if (account.status !== "ACTIVE") {
      throw {
        status: 403,
        code: "ACCOUNT_INACTIVE",
        message: "Account is not active for payments.",
      };
    }

    // 4. Check available balance
    if (account.balance < numericAmount) {
      throw {
        status: 422,
        code: "INSUFFICIENT_BALANCE",
        message: "There is not enough balance for this payment.",
        availableBalance: account.balance,
      };
    }

    // 5. Create Payment Intent (10-minute expiry)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const payment = await Payment.create({
      userId,
      accountId: account._id,
      merchantId: merchant._id,
      amount: numericAmount,
      currency: "INR",
      status: "INITIATED",
      expiresAt,
    });

    return {
      paymentId: payment._id.toString(),
      merchant: {
        id: merchant._id.toString(),
        name: merchant.name,
        upiId: merchant.upiId,
        category: merchant.category,
      },
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      expiresAt: payment.expiresAt.toISOString(),
    };
  }

  /**
   * Retrieves payment details and user's current account balance for review.
   */
  async getPaymentDetails(userId: string, paymentId: string) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw {
        status: 404,
        code: "PAYMENT_NOT_FOUND",
        message: "Payment intent could not be found.",
      };
    }

    // Verify ownership
    if (payment.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view this payment.",
      };
    }

    // Check expiration
    if (
      payment.status === "INITIATED" &&
      new Date() > new Date(payment.expiresAt)
    ) {
      payment.status = "CANCELLED";
      await payment.save();
      throw {
        status: 410,
        code: "PAYMENT_EXPIRED",
        message: "This payment request has expired. Please start again.",
      };
    }

    const merchant = await merchantService.lookupMerchant({
      id: payment.merchantId.toString(),
    });
    const account = await accountService.ensureAccountForUser(userId);

    return {
      paymentId: payment._id.toString(),
      merchant: {
        id: merchant._id.toString(),
        name: merchant.name,
        upiId: merchant.upiId,
        category: merchant.category,
      },
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      accountBalance: account.balance,
      estimatedRemainingBalance: Math.max(account.balance - payment.amount, 0),
      expiresAt: payment.expiresAt.toISOString(),
    };
  }

  /**
   * Atomically executes payment with idempotency key deduplication.
   */
  async executePayment(userId: string, params: ExecutePaymentParams) {
    const { paymentId, idempotencyKey } = params;

    if (!paymentId) {
      throw {
        status: 400,
        code: "INVALID_PARAMS",
        message: "Payment ID is required.",
      };
    }

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      throw {
        status: 400,
        code: "INVALID_PARAMS",
        message: "A unique idempotencyKey is required.",
      };
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw {
        status: 404,
        code: "PAYMENT_NOT_FOUND",
        message: "Payment intent not found.",
      };
    }

    // Check ownership
    if (payment.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to execute this payment.",
      };
    }

    // IDEMPOTENCY CHECK: If already COMPLETED, return previous result safely without double-charging
    if (payment.status === "COMPLETED") {
      const account = await accountService.ensureAccountForUser(userId);
      return {
        duplicate: true,
        payment: {
          paymentId: payment._id.toString(),
          status: "COMPLETED",
          transactionId: payment.transactionId?.toString() || payment._id.toString(),
          referenceId: payment.referenceId || `SAH-2026-${payment._id.toString().slice(-4)}`,
          remainingBalance: account.balance,
        },
      };
    }

    // Verify executable status
    if (payment.status !== "INITIATED" && payment.status !== "PROCESSING") {
      throw {
        status: 400,
        code: "PAYMENT_NOT_EXECUTABLE",
        message: `Payment cannot be executed with status ${payment.status}.`,
      };
    }

    // Check expiration
    if (new Date() > new Date(payment.expiresAt)) {
      payment.status = "CANCELLED";
      await payment.save();
      throw {
        status: 410,
        code: "PAYMENT_EXPIRED",
        message: "This payment request has expired. Please start again.",
      };
    }

    const merchant = await merchantService.lookupMerchant({
      id: payment.merchantId.toString(),
    });

    // Mark as PROCESSING and assign idempotency key
    payment.status = "PROCESSING";
    payment.idempotencyKey = idempotencyKey;
    await payment.save();

    // Generate unique server-side reference ID
    const referenceId = `SAH-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // Atomically debit account via ledger service
      const { updatedAccount, transaction } =
        await ledgerService.executeDebitTransaction({
          accountId: payment.accountId.toString(),
          userId,
          amount: payment.amount,
          title: merchant.name,
          category: "MERCHANT_PAYMENT",
          referenceId,
          recipientName: merchant.name,
          recipientUpiId: merchant.upiId,
        });

      // Update payment record to COMPLETED
      payment.status = "COMPLETED";
      payment.referenceId = referenceId;
      payment.transactionId = transaction._id as any;
      payment.completedAt = new Date();
      await payment.save();

      return {
        duplicate: false,
        payment: {
          paymentId: payment._id.toString(),
          status: "COMPLETED",
          transactionId: transaction._id.toString(),
          referenceId,
          remainingBalance: updatedAccount.balance,
        },
      };
    } catch (err) {
      payment.status = "FAILED";
      await payment.save();
      throw err;
    }
  }

  /**
   * Retrieves payment receipt for a completed payment.
   */
  async getReceipt(userId: string, paymentId: string) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw {
        status: 404,
        code: "PAYMENT_NOT_FOUND",
        message: "Payment receipt not found.",
      };
    }

    // Check ownership
    if (payment.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view this receipt.",
      };
    }

    if (payment.status !== "COMPLETED") {
      throw {
        status: 400,
        code: "PAYMENT_NOT_COMPLETED",
        message: "Payment has not completed yet.",
      };
    }

    const merchant = await merchantService.lookupMerchant({
      id: payment.merchantId.toString(),
    });
    const account = await accountService.ensureAccountForUser(userId);

    return {
      paymentId: payment._id.toString(),
      transactionId: payment.transactionId?.toString() || payment._id.toString(),
      referenceId: payment.referenceId || "SAH-2026-9481",
      merchantName: merchant.name,
      merchantUpi: merchant.upiId,
      amount: payment.amount,
      currency: payment.currency,
      status: "COMPLETED",
      remainingBalance: account.balance,
      completedAt:
        payment.completedAt?.toISOString() ||
        payment.updatedAt.toISOString(),
      disclaimer: "Demo payment completed · Internal ledger transaction",
    };
  }
}

export const paymentService = new PaymentService();
