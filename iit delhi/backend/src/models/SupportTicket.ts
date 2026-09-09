import mongoose, { Document, Schema } from "mongoose";
import { ISupportTicket } from "../types/support";

export interface SupportTicketDocument
  extends Omit<ISupportTicket, "_id">,
    Document {}

const SupportTicketSchema = new Schema<SupportTicketDocument>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    relatedTransactionId: {
      type: Schema.Types.ObjectId as any,
      ref: "Transaction",
      default: null,
    },
    category: {
      type: String,
      enum: [
        "FAILED_PAYMENT",
        "PAYMENT_DISPUTE",
        "ACCOUNT_HELP",
        "LOAN_HELP",
        "KYC_HELP",
        "OTHER",
      ],
      default: "FAILED_PAYMENT",
    },
    reportedIssue: {
      type: String,
      required: true,
      trim: true,
    },
    recordedViaVoice: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["IN_REVIEW", "RESOLVED", "REJECTED"],
      default: "IN_REVIEW",
      index: true,
    },
    resolutionSlaHours: {
      type: Number,
      default: 2,
    },
    estimatedResolutionTime: {
      type: String,
      default: "2 hours",
    },
    resolvedAt: {
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

export const SupportTicket = mongoose.model<SupportTicketDocument>(
  "SupportTicket",
  SupportTicketSchema
);
