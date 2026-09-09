import { connectDatabase, disconnectDatabase } from "./config/database";
import { User } from "./models/User";
import { OnboardingSession } from "./models/OnboardingSession";
import { KycRecord } from "./models/KycRecord";
import { accountService } from "./services/account.service";

async function seed() {
  console.log("[Sahara Seed] Connecting to MongoDB...");
  await connectDatabase();

  const demoPhone = "+919876543210";
  console.log(`[Sahara Seed] Upserting returning demo user: ${demoPhone}`);

  const user = await User.findOneAndUpdate(
    { phone: demoPhone },
    {
      $set: {
        phone: demoPhone,
        name: "Ravi Kumar",
        preferredLanguage: "hinglish",
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
        kycStatus: "VERIFIED",
      },
    },
    { upsert: true, new: true }
  );

  // Seed completed onboarding session
  await OnboardingSession.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        userId: user._id,
        currentStep: "COMPLETED",
        completedSteps: ["STEP_0_NAME", "STEP_1_PRIVACY", "STEP_2_DOCUMENT", "COMPLETED"],
        consentGivenAt: new Date(),
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Seed demo KYC record
  await KycRecord.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        userId: user._id,
        documentType: "AADHAAR",
        documentNumberMasked: "XXXX-XXXX-2841",
        verifiedName: "Ravi Kumar",
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Ensure demo account and transactions exist
  await accountService.ensureAccountForUser(user._id.toString());

  // Ensure demo merchants exist
  const { merchantService } = await import("./services/merchant.service");
  await merchantService.ensureDemoMerchants();

  // Ensure demo loan exists
  const { loanService } = await import("./services/loan.service");
  await loanService.ensureDemoLoan(user._id.toString());

  console.log("[Sahara Seed] Demo returning user, account, transactions, merchants, and loans successfully seeded!");
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Sahara Seed Error]:", err);
  process.exit(1);
});
