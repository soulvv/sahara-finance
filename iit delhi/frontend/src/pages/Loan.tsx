import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
  Volume2,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { PageTransition } from "../motion/pageTransitions";
import { useCountUp, formatINR } from "../hooks/useCountUp";
import { useLang } from "../hooks/useLang";
import { slideUp, staggerContainer } from "../motion/variants";
import {
  getActiveLoan,
  getLoanRepayments,
  repayNextEmi,
  LoanData,
  LoanRepaymentItem,
} from "../lib/api";

function formatDueDate(dateStr: string | null, isHindi: boolean): string {
  if (!dateStr) return isHindi ? "पूर्ण चुकता" : "Fully Paid";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function Loan() {
  const [, nav] = useLocation();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [loan, setLoan] = useState<LoanData | null>(null);
  const [repayments, setRepayments] = useState<LoanRepaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepaying, setIsRepaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repaidPercent = useCountUp(loan?.repaidPercent ?? 67, 1200);
  const totalPaid = useCountUp(loan?.paidAmount ?? 3600, 1200);
  const remainingAmount = loan?.remainingAmount ?? 1800;
  const isPaid = loan?.status === "PAID" || remainingAmount <= 0;

  const loadLoanData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loanRes = await getActiveLoan();
      if (loanRes.success && loanRes.loan) {
        setLoan(loanRes.loan);
        const repRes = await getLoanRepayments(loanRes.loan.loanId);
        if (repRes.success && Array.isArray(repRes.repayments)) {
          setRepayments(repRes.repayments);
        }
      }
    } catch (err: any) {
      console.error("[Loan] Error loading loan details:", err);
      setError(isHindi ? "ऋण विवरण लोड नहीं हो सका।" : "Loan information could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [isHindi]);

  useEffect(() => {
    loadLoanData();
  }, [loadLoanData]);

  const handleRepayEmi = async () => {
    if (!loan || isRepaying || isPaid) return;

    setIsRepaying(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `emi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await repayNextEmi(loan.loanId, idempotencyKey);
      if (res.success) {
        toast.success(
          isHindi
            ? `₹${formatINR(res.repayment.amount)} की मासिक किस्त जमा हो गई!`
            : `₹${formatINR(res.repayment.amount)} EMI repayment completed!`
        );
        await loadLoanData();
      }
    } catch (err: any) {
      console.error("[Loan] Repayment error:", err);
      if (err.message && err.message.includes("balance")) {
        toast.error(isHindi ? "खाते में पर्याप्त बैलेंस नहीं है।" : "Insufficient balance in account.");
      } else {
        toast.error(err.message || (isHindi ? "किस्त जमा नहीं हो सकी।" : "EMI repayment failed."));
      }
    } finally {
      setIsRepaying(false);
    }
  };

  return (
    <PageTransition className="flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "मेरा ऋण (Loan)" : "My loan"}
        onBack={() => nav("/dashboard")}
      />
      <motion.div
        className="content-scroll pb-24"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <span className="signal-notch" />
        <motion.h1
          variants={slideUp}
          className="mt-7 text-3xl font-extrabold text-[#17324d]"
        >
          {isHindi ? "आपका ऋण, सरल भाषा में।" : "Your loan, simply explained."}
        </motion.h1>

        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between rounded-2xl bg-[#fdf2f0] border border-[#f3dfd8] p-4 text-xs font-bold text-[#b65c4a]"
          >
            <span>{error}</span>
            <button
              onClick={loadLoanData}
              className="flex items-center gap-1 underline font-extrabold text-[#b65c4a] ml-2"
            >
              <RefreshCw size={12} /> {t.tryAgain}
            </button>
          </motion.div>
        )}

        {/* Repayment Progress */}
        <motion.section
          variants={slideUp}
          className="mt-7 rounded-[25px] bg-[#e9f0ea] p-5 shadow-sm border border-[#c5d9c9]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#356449]">
              {isPaid
                ? (isHindi ? "ऋण पूर्ण रूप से चुकता" : "Loan fully repaid")
                : (isHindi ? "शेष ऋण राशि" : "Remaining to repay")}
            </span>
            <Landmark className="text-[#3c6f53]" size={22} />
          </div>

          <div className="mt-2 text-4xl font-extrabold text-[#17324d]">
            {isLoading && !loan ? (
              <span className="opacity-40 animate-pulse">₹··,···</span>
            ) : isPaid ? (
              <span className="text-[#356449] flex items-center gap-2">
                ₹0 <CheckCircle2 size={26} />
              </span>
            ) : (
              `₹${formatINR(remainingAmount)}`
            )}
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#c5d9c9]">
            <motion.div
              className="h-full rounded-full bg-[#5b936d]"
              initial={{ width: 0 }}
              animate={{ width: `${repaidPercent}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <div className="mt-3 text-xs font-semibold text-[#356449]">
            {repaidPercent}% {isHindi ? "जमा" : "repaid"} · ₹{formatINR(totalPaid)} {isHindi ? "कुल भुगतान" : "paid"} ·{" "}
            {isPaid
              ? (isHindi ? "सभी किश्तें पूर्ण! 🎉" : "All payments completed! 🎉")
              : (isHindi ? "समय पर भुगतान जारी रखें" : "You're doing well")}
          </div>
        </motion.section>

        {/* Transparent Breakdown */}
        <motion.div
          variants={slideUp}
          className="mt-5 rounded-2xl bg-[#fffdf8] border border-[#e4dccd] overflow-hidden shadow-sm"
        >
          <div className="p-4 border-b border-[#eee8db]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8b7c68]">
              {isHindi ? "ऋण का संपूर्ण विवरण" : "Complete cost breakdown"}
            </div>
          </div>
          <div className="divide-y divide-[#eee8db]">
            {[
              [isHindi ? "मूल राशि (लिया गया ऋण)" : "You borrowed", `₹${formatINR(loan?.principalAmount ?? 5000)}`],
              [isHindi ? "कुल चुकता राशि" : "Total repayment", `₹${formatINR(loan?.totalRepayable ?? 5400)}`],
              [isHindi ? "कुल ब्याज" : "Interest", `₹${formatINR(loan?.interestAmount ?? 400)}`],
              [isHindi ? "अवधि" : "Duration", `${loan?.durationMonths ?? 3} ${isHindi ? "महीने" : "months"}`],
              [isHindi ? "मासिक किस्त (EMI)" : "Monthly EMI", `₹${formatINR(loan?.monthlyEmi ?? 1800)}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm text-[#66717b]">{label}</span>
                <span className="text-sm font-extrabold text-[#17324d]">
                  {isLoading && !loan ? "···" : value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next Payment */}
        {!isPaid && (
          <motion.div variants={slideUp} className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#fffdf8] p-4 border border-[#e4dccd] shadow-sm">
              <div className="text-xs text-[#8b7c68]">{isHindi ? "अगली किस्त" : "Next repayment"}</div>
              <div className="mt-2 text-lg font-extrabold text-[#17324d]">
                ₹{formatINR(loan?.monthlyEmi ?? 1800)}
              </div>
            </div>
            <div className="rounded-2xl bg-[#fffdf8] p-4 border border-[#e4dccd] shadow-sm">
              <div className="text-xs text-[#8b7c68]">{isHindi ? "देय तिथि" : "Due date"}</div>
              <div className="mt-2 text-lg font-extrabold text-[#17324d]">
                {formatDueDate(loan?.nextDueDate ?? null, isHindi)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Repayment timeline */}
        <motion.div
          variants={slideUp}
          className="mt-5 rounded-2xl bg-[#fffdf8] p-4 border border-[#e4dccd] shadow-sm"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-[#8b7c68] mb-3">
            {isHindi ? "किस्तों की समय-सीमा" : "Repayment timeline"}
          </div>
          <div className="flex items-center gap-1.5">
            {repayments.length > 0
              ? repayments.map((rep) => {
                  const isRepPaid = rep.status === "PAID";
                  const isRepDue = rep.status === "DUE";
                  const barColor = isRepPaid
                    ? "bg-[#5b936d]"
                    : isRepDue
                    ? "bg-[#e6a62d]"
                    : "bg-[#e4dccd]";
                  const label = isRepPaid
                    ? (isHindi ? "जमा ✓" : "Paid ✓")
                    : isRepDue
                    ? (isHindi ? "देय" : "Due")
                    : (isHindi ? "आगामी" : "Upcoming");

                  return (
                    <div
                      key={rep.installmentNumber}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div className={`h-2.5 w-full rounded-full ${barColor}`} />
                      <span className="mt-2 text-xs text-[#8b7c68] font-medium">
                        {label}
                      </span>
                    </div>
                  );
                })
              : [1, 2, 3].map((month) => (
                  <div key={month} className="flex-1 flex flex-col items-center">
                    <div
                      className={`h-2.5 w-full rounded-full ${
                        month === 1
                          ? "bg-[#5b936d]"
                          : month === 2
                          ? "bg-[#5b936d]"
                          : "bg-[#e6a62d]"
                      }`}
                    />
                    <span className="mt-2 text-xs text-[#8b7c68] font-medium">
                      {month < 3 ? (isHindi ? "जमा ✓" : "Paid ✓") : (isHindi ? "देय" : "Due")}
                    </span>
                  </div>
                ))}
          </div>
        </motion.div>

        {/* AI Explain */}
        <motion.div
          variants={slideUp}
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#e6a62d] bg-[#fff9e9] p-4 cursor-pointer hover:bg-[#fef5de] transition-colors shadow-sm"
        >
          <Volume2 className="text-[#b37b12] shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-sm font-bold text-[#17324d] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#b37b12]" />
              {isHindi ? "साथी से ऋण समझें" : "Explain this to me"}
            </div>
            <div className="mt-1 text-xs text-[#8b7c68]">
              {isHindi
                ? "सहारा साथी आपको सरल बोलचाल में ऋण की जानकारी बोलकर बताएगा।"
                : "Tap to have OmniDimension explain your loan in simple words."}
            </div>
          </div>
        </motion.div>

        <motion.div variants={slideUp} className="mt-7">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md active:scale-[0.98] transition-transform"
            disabled={isPaid || isRepaying || isLoading}
            onClick={handleRepayEmi}
          >
            {isRepaying ? (
              <>
                <Loader2 className="animate-spin" size={18} /> {isHindi ? "किस्त जमा हो रही है..." : "Processing EMI..."}
              </>
            ) : isPaid ? (
              <>
                <CheckCircle2 size={18} /> {isHindi ? "ऋण पूर्ण रूप से चुकता हो चुका है" : "Loan Fully Repaid"}
              </>
            ) : (
              <>
                {isHindi ? "अगली किस्त जमा करें" : "Pay next EMI"} (₹{formatINR(loan?.monthlyEmi ?? 1800)}){" "}
                <ArrowRight className="ml-1 inline" size={18} />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
