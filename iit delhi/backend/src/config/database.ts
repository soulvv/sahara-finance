import mongoose from "mongoose";
import { env } from "./env";
import { inMemoryDb } from "./in-memory-db";

let isConnected = false;
let isInMemoryMode = false;

export function isUsingInMemoryDatabase(): boolean {
  return isInMemoryMode;
}

export async function connectDatabase(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1500,
      autoIndex: true,
    });

    isConnected = true;
    isInMemoryMode = false;
    console.log(`[Sahara Backend] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error("[Sahara Backend] MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[Sahara Backend] MongoDB disconnected");
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.warn(
      `[Sahara Backend] MongoDB connection to "${env.MONGODB_URI}" failed (offline/local dev). Activating In-Memory Resilient Engine...`
    );

    // Import and patch all models
    const [
      { User },
      { Account },
      { Transaction },
      { Loan },
      { LoanRepayment },
      { SupportTicket },
      { KycRecord },
      { OnboardingSession },
      { OTP },
      { AiActionAudit },
      { AuditLog },
      { Merchant },
      { PhoneCallRecord },
      { AssistedOnboardingSession },
      { Payment },
    ] = await Promise.all([
      import("../models/User"),
      import("../models/Account"),
      import("../models/Transaction"),
      import("../models/Loan"),
      import("../models/LoanRepayment"),
      import("../models/SupportTicket"),
      import("../models/KycRecord"),
      import("../models/OnboardingSession"),
      import("../models/OTP"),
      import("../models/AiActionAudit"),
      import("../models/AuditLog"),
      import("../models/Merchant"),
      import("../models/PhoneCallRecord"),
      import("../models/AssistedOnboardingSession"),
      import("../models/Payment"),
    ]);

    const allModels = [
      User,
      Account,
      Transaction,
      Loan,
      LoanRepayment,
      SupportTicket,
      KycRecord,
      OnboardingSession,
      OTP,
      AiActionAudit,
      AuditLog,
      Merchant,
      PhoneCallRecord,
      AssistedOnboardingSession,
      Payment,
    ];

    for (const model of allModels) {
      inMemoryDb.patchModel(model);
    }

    await inMemoryDb.seedDemoData();

    isConnected = true;
    isInMemoryMode = true;
    console.log("[Sahara Backend] In-Memory Dual-Mode Engine activated successfully. Demo state seeded.");

    return mongoose;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  if (!isInMemoryMode) {
    await mongoose.disconnect();
  }
  isConnected = false;
  console.log("[Sahara Backend] Database disconnected gracefully");
}
