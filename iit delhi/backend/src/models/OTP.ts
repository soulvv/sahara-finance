import mongoose, { Document, Schema } from "mongoose";
import { IOTP } from "../types/auth";

export interface OTPDocument extends Omit<IOTP, "_id">, Document {}

const OTPSchema = new Schema<OTPDocument>(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-delete documents once expiresAt passes
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const OTP = mongoose.model<OTPDocument>("OTP", OTPSchema);
