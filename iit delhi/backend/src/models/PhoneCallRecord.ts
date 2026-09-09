import mongoose, { Document, Schema } from "mongoose";

export interface IPhoneCallRecord {
  _id: string;
  callId: string;
  providerCallId: string;
  userId?: string | null;
  phoneNumberMasked: string;
  rawPhoneNumber?: string;
  reason: string;
  isLoginCall?: boolean;
  capturedName?: string | null;
  loginAuthToken?: string | null;
  callAuthStatus?: "PENDING" | "AUTHENTICATED" | "FAILED";
  status: "REQUESTED" | "RINGING" | "CONNECTED" | "COMPLETED" | "FAILED" | "CANCELLED";
  durationSeconds?: number | null;
  summary?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface PhoneCallRecordDocument
  extends Omit<IPhoneCallRecord, "_id">,
    Document {}

const PhoneCallRecordSchema = new Schema<PhoneCallRecordDocument>(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerCallId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    phoneNumberMasked: {
      type: String,
      required: true,
    },
    rawPhoneNumber: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: "ASSISTED_ONBOARDING",
    },
    isLoginCall: {
      type: Boolean,
      default: false,
      index: true,
    },
    capturedName: {
      type: String,
      default: null,
    },
    loginAuthToken: {
      type: String,
      default: null,
    },
    callAuthStatus: {
      type: String,
      enum: ["PENDING", "AUTHENTICATED", "FAILED"],
      default: "PENDING",
    },
    status: {
      type: String,
      enum: ["REQUESTED", "RINGING", "CONNECTED", "COMPLETED", "FAILED", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    summary: {
      type: String,
      default: null,
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

PhoneCallRecordSchema.index({ userId: 1, createdAt: -1 });

export const PhoneCallRecord = mongoose.model<PhoneCallRecordDocument>(
  "PhoneCallRecord",
  PhoneCallRecordSchema
);
