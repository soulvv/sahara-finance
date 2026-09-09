import mongoose, { Document, Schema } from "mongoose";
import { ILoanRepayment } from "../types/loan";

export interface LoanRepaymentDocument
  extends Omit<ILoanRepayment, "_id">,
    Document {}

const LoanRepaymentSchema = new Schema<LoanRepaymentDocument>(
  {
    loanId: {
      type: Schema.Types.ObjectId as any,
      ref: "Loan",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    installmentNumber: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 1800,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PAID", "DUE", "UPCOMING"],
      default: "DUE",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    transactionId: {
      type: Schema.Types.ObjectId as any,
      ref: "Transaction",
      default: null,
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

LoanRepaymentSchema.index({ loanId: 1, installmentNumber: 1 }, { unique: true });

export const LoanRepayment = mongoose.model<LoanRepaymentDocument>(
  "LoanRepayment",
  LoanRepaymentSchema
);
