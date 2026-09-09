import { connectDatabase, disconnectDatabase } from "../config/database";
import { User } from "../models/User";
import { OnboardingSession } from "../models/OnboardingSession";
import { KycRecord } from "../models/KycRecord";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";
import { SupportTicket } from "../models/SupportTicket";
import { PhoneCallRecord } from "../models/PhoneCallRecord";
import { AssistedOnboardingSession } from "../models/AssistedOnboardingSession";

async function cleanDatabase() {
  console.log("[Sahara Clean DB] Connecting to MongoDB...");
  await connectDatabase();

  console.log("[Sahara Clean DB] Wiping all collections...");
  const [
    users,
    onboarding,
    kyc,
    accounts,
    transactions,
    tickets,
    calls,
    assistedSessions,
  ] = await Promise.all([
    User.deleteMany({}),
    OnboardingSession.deleteMany({}),
    KycRecord.deleteMany({}),
    Account.deleteMany({}),
    Transaction.deleteMany({}),
    SupportTicket.deleteMany({}),
    PhoneCallRecord.deleteMany({}),
    AssistedOnboardingSession.deleteMany({}),
  ]);

  console.log(`[Sahara Clean DB] Deleted:
  - Users: ${users.deletedCount}
  - Onboarding Sessions: ${onboarding.deletedCount}
  - KYC Records: ${kyc.deletedCount}
  - Accounts: ${accounts.deletedCount}
  - Transactions: ${transactions.deletedCount}
  - Support Tickets: ${tickets.deletedCount}
  - Phone Call Records: ${calls.deletedCount}
  - Assisted Sessions: ${assistedSessions.deletedCount}`);

  console.log("[Sahara Clean DB] Database successfully cleaned! 0 users remaining.");
  await disconnectDatabase();
  process.exit(0);
}

cleanDatabase().catch((err) => {
  console.error("[Sahara Clean DB Error]:", err);
  process.exit(1);
});
