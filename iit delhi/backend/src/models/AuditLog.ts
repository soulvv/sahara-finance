import mongoose, { Document, Schema } from "mongoose";
import { IAuditLog } from "../types/onboarding";

export interface AuditLogDocument
  extends Omit<IAuditLog, "_id">,
    Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
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

export const AuditLog = mongoose.model<AuditLogDocument>(
  "AuditLog",
  AuditLogSchema
);
