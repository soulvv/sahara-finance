import { useEffect, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles, Receipt, Check } from "lucide-react";
import { PageTransition } from "../motion/pageTransitions";
import { useCountUp, formatINR } from "../hooks/useCountUp";
import { useAuthStore } from "../hooks/useAuth";
import { useLang } from "../hooks/useLang";
import { getPaymentReceipt, PaymentReceipt } from "../lib/api";

export default function Success({
  variant = "payment",
}: {
  variant?: "payment" | "onboarding";
}) {
  const [, nav] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const paymentId = searchParams.get("paymentId");
  const { user, refreshProfile } = useAuthStore();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(variant === "payment" && Boolean(paymentId));

  const loadReceipt = useCallback(async () => {
    if (variant !== "payment" || !paymentId) return;
    setIsLoadingReceipt(true);
    try {
      const res = await getPaymentReceipt(paymentId);
      if (res.success && res.receipt) {
        setReceipt(res.receipt);
      }
    } catch (err) {
      console.error("[Success] Error fetching receipt:", err);
    } finally {
      setIsLoadingReceipt(false);
    }
  }, [variant, paymentId]);

  useEffect(() => {
    if (variant === "onboarding") {
      refreshProfile();
    } else if (variant === "payment") {
      loadReceipt();
    }
  }, [variant, refreshProfile, loadReceipt]);

  const displayName = user?.name || (isHindi ? "खाता धारक" : "Account Holder");
  const displayPhone = user?.phone || "+91 98765 43210";
  const firstName = displayName.split(" ")[0] || displayName;

  const sentAmount = receipt?.amount ?? 500;
  const remaining = receipt?.remainingBalance ?? (8420 - sentAmount);
  const remainingDisplay = useCountUp(remaining, 1000);
  const merchantName = receipt?.merchantName || "Rahul General Store";
  const referenceId = receipt?.referenceId || "SAH-2026-9481";

  // Onboarding completion variant
  if (variant === "onboarding") {
    return (
      <PageTransition className="sahara-grain flex flex-1 flex-col items-center justify-center px-6 text-center h-full bg-[#f8f4eb] relative">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="w-full max-w-[320px] rounded-[26px] p-6 shadow-[0_12px_32px_rgba(55,42,21,.12)] border border-[#e4dccd] bg-[#fffdf8] mt-4 flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#5b936d]/10 rounded-full blur-xl" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 15 }}
            className="grid h-20 w-20 place-items-center rounded-full bg-[#e9f0ea] text-[#3c6f53] shadow-inner"
          >
            <ShieldCheck size={44} />
          </motion.div>
          <div className="mt-4 px-3 py-1 rounded-full bg-[#e9f0ea] text-[#3c6f53] font-bold text-xs flex items-center gap-1.5">
            <Check size={14} /> {isHindi ? "खाता तैयार · केवाईसी सत्यापित" : "Account Ready · Demo KYC Verified"}
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 text-3xl font-extrabold tracking-[-.05em] text-[#17324d]"
        >
          {isHindi ? `आपका खाता तैयार है, ${firstName}!` : `Account Ready, ${firstName}!`}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-sm leading-6 text-[#66717b] max-w-[300px]"
        >
          {isHindi
            ? `सहारा में आपका स्वागत है। आपका डिजिटल खाता और आपकी जानकारी हमेशा आपके नियंत्रण में रहेगी।`
            : `Welcome to Sahara, ${firstName}. Everything is set up — your money and your information stay in your control.`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 w-full rounded-2xl bg-[#fffdf8] p-4 text-left border border-[#e4dccd] shadow-sm text-sm"
        >
          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-[#8b7c68]">{isHindi ? "खाता धारक" : "Account Holder"}</span>
              <strong className="font-extrabold text-[#17324d]">
                {displayName}
              </strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8b7c68]">{isHindi ? "मोबाइल" : "Mobile"}</span>
              <span className="font-bold text-[#17324d]">{displayPhone}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8b7c68]">{isHindi ? "सत्यापन" : "Verification"}</span>
              <span className="font-bold text-[#3c6f53]">{isHindi ? "केवाईसी पूर्ण" : "Demo KYC complete"}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-[#eee8db] pt-2.5">
              <span className="text-[#8b7c68]">{isHindi ? "स्थिति" : "Status"}</span>
              <span className="font-bold text-[#3c6f53] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5b936d]" />
                {isHindi ? "उपयोग के लिए तैयार" : "Ready to use"}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-full"
        >
          <button
            className="primary-button w-full flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98] transition-transform"
            onClick={() => nav("/dashboard")}
          >
            {isHindi ? "डैशबोर्ड पर जाएं" : "Go to my dashboard"} <ArrowRight size={18} />
          </button>
        </motion.div>
      </PageTransition>
    );
  }

  // Payment completion variant
  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col items-center justify-center px-6 text-center h-full bg-[#f8f4eb] relative">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="w-full max-w-[320px] rounded-[26px] p-6 shadow-[0_12px_32px_rgba(55,42,21,.12)] border border-[#e4dccd] bg-[#fffdf8] mt-4 flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#5b936d]/10 rounded-full blur-xl" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 15 }}
          className="grid h-20 w-20 place-items-center rounded-full bg-[#e9f0ea] text-[#3c6f53] shadow-inner"
        >
          <CheckCircle2 size={44} />
        </motion.div>
        <div className="mt-4 px-3 py-1 rounded-full bg-[#e9f0ea] text-[#3c6f53] font-bold text-xs flex items-center gap-1.5">
          <Receipt size={14} /> {isHindi ? "सुरक्षित आंतरिक लेजर भुगतान" : "100% Secure Ledger Transaction"}
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5 text-3xl font-extrabold tracking-[-.05em] text-[#17324d]"
      >
        {isHindi ? "भुगतान सफल रहा!" : "Payment Complete!"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-2 text-sm leading-6 text-[#66717b] max-w-[290px]"
      >
        {isLoadingReceipt ? (
          <span className="flex items-center justify-center gap-1">
            <Loader2 className="animate-spin" size={14} /> {isHindi ? "रसीद तैयार हो रही है..." : "Generating receipt..."}
          </span>
        ) : (
          <span>
            {isHindi
              ? `₹${formatINR(sentAmount)} सफलतापूर्वक ${merchantName} को भेज दिए गए हैं।`
              : `₹${formatINR(sentAmount)} has been sent securely to ${merchantName}.`}
          </span>
        )}
      </motion.p>

      {/* Dynamic Receipt Breakdown Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-5 w-full rounded-2xl bg-[#fffdf8] p-4 text-left border border-[#e4dccd] shadow-sm text-sm"
      >
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[#8b7c68]">{isHindi ? "किसे भेजा गया" : "Recipient"}</span>
            <strong className="font-extrabold text-[#17324d]">
              {merchantName}
            </strong>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8b7c68]">{isHindi ? "भेजी गई राशि" : "Amount Sent"}</span>
            <span className="font-bold text-[#b65c4a]">
              −₹{formatINR(sentAmount)}.00
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8b7c68]">{isHindi ? "शेष बैलेंस" : "Remaining Balance"}</span>
            <span className="font-extrabold text-[#17324d]">
              ₹{formatINR(remainingDisplay)}.00
            </span>
          </div>
          <div className="flex justify-between text-xs border-t border-[#eee8db] pt-2.5">
            <span className="text-[#8b7c68]">{isHindi ? "संदर्भ संख्या (Ref ID)" : "Reference ID"}</span>
            <span className="font-mono text-xs font-bold text-[#b37b12]">
              {referenceId}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Primary CTA: Back to Home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 w-full"
      >
        <button
          className="primary-button w-full flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98] transition-transform"
          onClick={() => nav("/dashboard")}
        >
          {isHindi ? "मुख्य पृष्ठ पर जाएं" : "Back to Home"} <ArrowRight size={18} />
        </button>
      </motion.div>
    </PageTransition>
  );
}
