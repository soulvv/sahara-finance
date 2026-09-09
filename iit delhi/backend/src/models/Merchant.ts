import mongoose, { Document, Schema } from "mongoose";
import { IMerchant } from "../types/merchant";

export interface MerchantDocument
  extends Omit<IMerchant, "_id">,
    Document {}

const MerchantSchema = new Schema<MerchantDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    upiId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: "General",
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
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

export const Merchant = mongoose.model<MerchantDocument>(
  "Merchant",
  MerchantSchema
);
