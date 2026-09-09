import mongoose, { Document, Schema } from "mongoose";
import { IPayment } from "../types/payment";

export interface PaymentDocument
  extends Omit<IPayment, "_id">,
    Document {}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId as any,
      ref: "Account",
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId as any,
      ref: "Merchant",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["INITIATED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "INITIATED",
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
    referenceId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId as any,
      ref: "Transaction",
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
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

export const Payment = mongoose.model<PaymentDocument>(
  "Payment",
  PaymentSchema
);
