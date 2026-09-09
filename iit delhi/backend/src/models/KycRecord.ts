import mongoose, { Document, Schema } from "mongoose";
import { IKycRecord } from "../types/kyc";

export interface KycRecordDocument
  extends Omit<IKycRecord, "_id">,
    Document {}

const KycRecordSchema = new Schema<KycRecordDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ["AADHAAR", "VOTER_ID", "PAN"],
      required: true,
    },
    documentNumberMasked: {
      type: String,
      required: true,
    },
    verifiedName: {
      type: String,
      required: true,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "FAILED", "PENDING"],
      default: "VERIFIED",
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
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

export const KycRecord = mongoose.model<KycRecordDocument>(
  "KycRecord",
  KycRecordSchema
);
