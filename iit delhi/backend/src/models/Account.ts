import mongoose, { Document, Schema } from "mongoose";
import { IAccount } from "../types/account";

export interface AccountDocument
  extends Omit<IAccount, "_id">,
    Document {}

const AccountSchema = new Schema<AccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountNumberMasked: {
      type: String,
      required: true,
      default: "XXXX XXXX 2841",
    },
    balance: {
      type: Number,
      required: true,
      default: 8420.0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "FROZEN"],
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

export const Account = mongoose.model<AccountDocument>("Account", AccountSchema);
