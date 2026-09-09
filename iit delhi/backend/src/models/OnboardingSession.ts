import mongoose, { Document, Schema } from "mongoose";
import { IOnboardingSession, OnboardingStep } from "../types/onboarding";

export interface OnboardingSessionDocument
  extends Omit<IOnboardingSession, "_id">,
    Document {}

const OnboardingSessionSchema = new Schema<OnboardingSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    currentStep: {
      type: String,
      enum: ["STEP_0_NAME", "STEP_1_PRIVACY", "STEP_2_DOCUMENT", "COMPLETED"],
      default: "STEP_0_NAME",
    },
    completedSteps: {
      type: [String],
      default: [],
    },
    consentGivenAt: {
      type: Date,
      default: null,
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

export const OnboardingSession = mongoose.model<OnboardingSessionDocument>(
  "OnboardingSession",
  OnboardingSessionSchema
);
