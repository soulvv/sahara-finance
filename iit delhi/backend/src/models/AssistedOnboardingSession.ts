import mongoose, { Document, Schema } from "mongoose";
import { AssistedSessionChannel, AssistedSessionStatus } from "../services/omnidim/types";

export interface IAssistedOnboardingSession {
  _id: string;
  sessionId: string;
  userId?: string | null;
  channel: AssistedSessionChannel;
  language: string;
  currentRoute: string;
  currentStep?: number | null;
  status: AssistedSessionStatus;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date | null;
}

export interface AssistedOnboardingSessionDocument
  extends Omit<IAssistedOnboardingSession, "_id">,
    Document {}

const AssistedOnboardingSessionSchema =
  new Schema<AssistedOnboardingSessionDocument>(
    {
      sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      userId: {
        type: Schema.Types.ObjectId as any,
        ref: "User",
        required: false,
        default: null,
        index: true,
      },
      channel: {
        type: String,
        enum: ["WEB_VOICE", "CHAT", "PHONE"],
        default: "WEB_VOICE",
      },
      language: {
        type: String,
        default: "hinglish",
      },
      currentRoute: {
        type: String,
        default: "/dashboard",
      },
      currentStep: {
        type: Number,
        default: null,
      },
      status: {
        type: String,
        enum: ["ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"],
        default: "ACTIVE",
        index: true,
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
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

AssistedOnboardingSessionSchema.index({ userId: 1, createdAt: -1 });

export const AssistedOnboardingSession =
  mongoose.model<AssistedOnboardingSessionDocument>(
    "AssistedOnboardingSession",
    AssistedOnboardingSessionSchema
  );
