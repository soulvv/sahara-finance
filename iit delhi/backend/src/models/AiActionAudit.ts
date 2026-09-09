import mongoose, { Document, Schema } from "mongoose";
import {
  ActionRiskLevel,
  AssistedSessionChannel,
  WebsiteActionType,
} from "../services/omnidim/types";

export interface IAiActionAudit {
  _id: string;
  userId: string;
  sessionId?: string | null;
  channel: AssistedSessionChannel;
  intent: string;
  actionType: WebsiteActionType;
  payloadSummary: Record<string, any>;
  riskLevel: ActionRiskLevel;
  requiresConfirmation: boolean;
  confirmed: boolean;
  executed: boolean;
  result?: string | null;
  createdAt: Date;
}

export interface AiActionAuditDocument
  extends Omit<IAiActionAudit, "_id">,
    Document {}

const AiActionAuditSchema = new Schema<AiActionAuditDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ["WEB_VOICE", "CHAT", "PHONE"],
      default: "CHAT",
    },
    intent: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    payloadSummary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    requiresConfirmation: {
      type: Boolean,
      default: false,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    executed: {
      type: Boolean,
      default: false,
    },
    result: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

AiActionAuditSchema.index({ userId: 1, createdAt: -1 });

export const AiActionAudit = mongoose.model<AiActionAuditDocument>(
  "AiActionAudit",
  AiActionAuditSchema
);
