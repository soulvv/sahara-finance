import mongoose, { Document, Schema } from "mongoose";
import { ITransaction } from "../types/transaction";

export interface TransactionDocument
  extends Omit<ITransaction, "_id">,
    Document {}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    accountId: {
      type: Schema.Types.ObjectId as any,
      ref: "Account",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
    },
    category: {
      type: String,
      enum: ["MERCHANT_PAYMENT", "RECHARGE", "GOVT_BENEFIT", "LOAN_EMI"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    recipientName: {
      type: String,
      default: null,
    },
    recipientUpiId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REVERSED"],
      default: "SUCCESS",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

TransactionSchema.index({ accountId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction = mongoose.model<TransactionDocument>(
  "Transaction",
  TransactionSchema
);
