import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "../types/auth";

export interface UserDocument extends Omit<IUser, "_id">, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: ["hi", "hinglish", "en"],
      default: "hinglish",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING_KYC"],
      default: "ACTIVE",
    },
    onboardingStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "IN_PROGRESS",
    },
    kycStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
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

export const User = mongoose.model<UserDocument>("User", UserSchema);
