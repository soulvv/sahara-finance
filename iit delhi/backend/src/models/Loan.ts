import mongoose, { Document, Schema } from "mongoose";
import { ILoan } from "../types/loan";

export interface LoanDocument extends Omit<ILoan, "_id">, Document {}

const LoanSchema = new Schema<LoanDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    loanNumber: {
      type: String,
      required: true,
      default: "LN-501",
    },
    principalAmount: {
      type: Number,
      required: true,
      default: 5000,
    },
    interestAmount: {
      type: Number,
      required: true,
      default: 400,
    },
    totalRepayable: {
      type: Number,
      required: true,
      default: 5400,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 3600,
    },
    remainingAmount: {
      type: Number,
      required: true,
      default: 1800,
    },
    durationMonths: {
      type: Number,
      required: true,
      default: 3,
    },
    monthlyEmi: {
      type: Number,
      required: true,
      default: 1800,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAID", "CANCELLED"],
      default: "ACTIVE",
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

export const Loan = mongoose.model<LoanDocument>("Loan", LoanSchema);
