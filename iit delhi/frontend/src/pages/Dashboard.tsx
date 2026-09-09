import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Send,
  Landmark,
  CircleHelp,
  ShieldCheck,
  MoreHorizontal,
  ArrowRight,
  RefreshCw,
  Loader2,
  Mic,
  MessageSquare,
  Phone,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  CreditCard,
  Wallet,
} from "lucide-react";
import { Top } from "../components/layout/Top";
import { BottomNav } from "../components/layout/BottomNav";
import { PageTransition } from "../motion/pageTransitions";
import { useLang } from "../hooks/useLang";
import { useAuthStore } from "../hooks/useAuth";
import { useVoiceStore } from "../features/voice/VoiceContext";
import { getAccountBalance, getRecentTransactions, TransactionItem } from "../lib/api";
import { SaathiChatModal } from "../components/chat/SaathiChatModal";
import { PhoneCallModal } from "../components/assistance/PhoneCallModal";
import { SafeToSpendCard } from "../components/intelligence/SafeToSpendCard";

function formatINR(n: number) {
  return n.toLocaleString("en-IN");
}

function useCountUp(target: number, durationMs = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - startTime) / durationMs);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * ease));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return val;
}

function formatRelativeDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return `Today, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "MERCHANT_PAYMENT":
      return <ShoppingBag size={18} className="text-[#e07a5f]" />;
    case "PEER_TRANSFER":
      return <ArrowUpRight size={18} className="text-[#3c6f53]" />;
    case "LOAN_DISBURSAL":
      return <Landmark size={18} className="text-[#2a9d8f]" />;
    case "LOAN_REPAYMENT":
      return <CreditCard size={18} className="text-[#e6a62d]" />;
    case "CASHBACK":
      return <Sparkles size={18} className="text-[#f4a261]" />;
    default:
      return <Wallet size={18} className="text-[#17324d]" />;
  }
}



const slideUp: any = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const staggerContainer: any = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function Dashboard() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { lang, t } = useLang();
  const { user } = useAuthStore();

  const [balance, setBalance] = useState<number>(0);
  const [accountMasked, setAccountMasked] = useState<string>("XXXX XXXX 2841");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);

  const balanceDisplay = useCountUp(balance, 1200);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [balanceRes, txRes] = await Promise.all([
        getAccountBalance(),
        getRecentTransactions(10),
      ]);

      if (balanceRes.success && balanceRes.account) {
        setBalance(balanceRes.account.balance);
        setAccountMasked(balanceRes.account.accountNumberMasked);
      }

      if (txRes.success && Array.isArray(txRes.transactions)) {
        setTransactions(txRes.transactions);
      }
    } catch (err: any) {
      console.error("[Dashboard] Error fetching backend financial data:", err);
      setError(
        lang === "hi"
          ? "शेष राशि लोड नहीं हो सकी। कृपया पुनः प्रयास करें।"
          : "Balance could not be loaded. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // "Activity" bottom-nav tab focuses the transactions list
  const activityRef = useRef<HTMLElement>(null);
  const isActivityTab = new URLSearchParams(search).get("tab") === "activity";

  useEffect(() => {
    if (isActivityTab) {
      activityRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isActivityTab]);

  // Voice→UI focus: when OmniDimension answers "Mera balance kitna hai?"
  const isBalanceFocus = new URLSearchParams(search).get("focus") === "balance";

  useEffect(() => {
    if (!isBalanceFocus) return;
    const timer = setTimeout(() => nav("/dashboard", { replace: true }), 4000);
    return () => clearTimeout(timer);
  }, [isBalanceFocus, nav]);

  const userDisplayName = user?.name || (lang === "hi" ? "उपयोगकर्ता" : "User");
  const greetingText = lang === "hi" ? `नमस्ते, ${userDisplayName} 🙏` : `Namaste, ${userDisplayName} 🙏`;

  return (
    <PageTransition className="flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top />
      <motion.div
        className="content-scroll pb-28"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Dynamic Greeting */}
        <motion.div
          variants={slideUp}
          className="mt-8 flex items-end justify-between"
        >
          <div>
            <p className="text-base font-extrabold text-[#e07a5f] tracking-tight">{greetingText}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#17324d]">
              {t.headline}
            </h1>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e9f0ea] text-[#3c6f53] shadow-sm">
            <BadgeCheck size={26} />
          </span>
        </motion.div>

        {/* Error Notification with Retry */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between rounded-2xl bg-[#fdf2f0] border border-[#f3dfd8] p-4 text-xs font-bold text-[#b65c4a]"
          >
            <span>{error}</span>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-1 underline font-extrabold text-[#b65c4a] ml-2"
            >
              <RefreshCw size={12} /> {t.tryAgain}
            </button>
          </motion.div>
        )}

        {/* Balance Card */}
        <motion.section
          variants={slideUp}
          className={`mt-7 rounded-[26px] bg-[#17324d] p-6 text-[#fffdf8] relative overflow-hidden group transition-all duration-500 ${
            isBalanceFocus
              ? "shadow-[0_20px_44px_rgba(23,50,77,.3)] ring-4 ring-[#e6a62d] ring-offset-4 ring-offset-[#f8f4eb] scale-[1.02]"
              : "shadow-[0_16px_32px_rgba(23,50,77,.2)]"
          }`}
        >
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-white/10 transition-colors duration-700" />
          <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-[#e6a62d]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-sm text-[#cbd8df] relative z-10">
            <span className="flex items-center gap-2 font-medium">
              {t.balance}
              {isBalanceFocus && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-1 rounded-full bg-[#e6a62d] px-2 py-0.5 text-[10px] font-extrabold text-[#17324d]"
                >
                  <Sparkles size={10} /> OmniDimension
                </motion.span>
              )}
            </span>
            <button
              onClick={loadDashboardData}
              aria-label="Refresh balance"
              className="hover:text-white transition-colors flex items-center gap-1 text-xs text-[#8da2b1]"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <MoreHorizontal size={18} />
              )}
            </button>
          </div>

          <div className="mt-2 text-4xl font-extrabold tracking-[-.05em] relative z-10">
            {isLoading && balance === 0 ? (
              <span className="opacity-40 animate-pulse">₹··,···.··</span>
            ) : (
              <>
                ₹{formatINR(balanceDisplay)}
                <span className="text-xl opacity-80">.00</span>
              </>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs font-semibold text-[#bfe0c4] relative z-10">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} /> {t.verified} · {accountMasked}
            </span>
          </div>
        </motion.section>

        {/* Safe-to-Spend & Financial Health Card (Phase 3) */}
        <SafeToSpendCard balance={balance} />

        {/* Saathi Multi-Channel Assistance Suite */}
        <motion.section
          variants={slideUp}
          className="mt-5 rounded-[22px] border border-[#e6a62d] bg-[#fff9e9] p-4 relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div
              onClick={() => useVoiceStore.getState().setOpen(true)}
              className="flex items-center gap-3.5 cursor-pointer flex-1"
            >
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e6a62d] text-[#17324d] shadow-sm">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#e6a62d] opacity-20" />
                <Mic size={20} />
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#b37b12] flex items-center gap-1.5">
                  <Sparkles size={12} /> {t.saathiCardTitle}
                </div>
                <div className="text-sm font-bold text-[#17324d]">
                  {t.greeting}
                </div>
                <p className="text-[11px] text-[#705e4f]">
                  {t.saathiCardDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsChatOpen(true)}
                title="Chat with Saathi"
                className="p-2.5 rounded-xl bg-white border border-[#e2d5c3] text-[#17324d] hover:bg-[#faf4e6] hover:text-[#e07a5f] transition-all shadow-sm flex items-center justify-center active:scale-95"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={() => setIsCallOpen(true)}
                title="Request a Phone Call"
                className="p-2.5 rounded-xl bg-white border border-[#e2d5c3] text-[#17324d] hover:bg-[#faf4e6] hover:text-[#2b6e56] transition-all shadow-sm flex items-center justify-center active:scale-95"
              >
                <Phone size={18} />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Primary Action: Send */}
        <motion.div variants={slideUp} className="mt-5">
          <button
            onClick={() => nav("/pay")}
            className="flex min-h-[72px] w-full items-center justify-between rounded-2xl bg-[#e6a62d] px-5 text-left font-extrabold text-[#17324d] shadow-[0_4px_12px_rgba(230,166,45,.2)] hover:bg-[#efb23e] transition-all active:scale-[0.98] hover:shadow-[0_8px_20px_rgba(230,166,45,.3)]"
          >
            <span className="flex items-center gap-3 text-lg font-bold">
              <Send size={22} /> {t.send}
            </span>
            <ArrowRight size={20} />
          </button>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div variants={slideUp} className="mt-3 flex gap-3">
          <button
            onClick={() => nav("/loan")}
            className="flex min-h-[60px] flex-1 items-center gap-2.5 rounded-2xl bg-[#e9f0ea] px-4 text-left text-sm font-extrabold text-[#17324d] hover:bg-[#d6e5da] transition-colors active:scale-[0.98] shadow-sm"
          >
            <Landmark size={20} className="text-[#3c6f53]" /> {t.loan}
          </button>
          <button
            onClick={() => nav("/help")}
            className="flex min-h-[60px] flex-1 items-center gap-2.5 rounded-2xl border border-[#e4dccd] bg-[#fffdf8] px-4 text-left text-sm font-extrabold text-[#17324d] hover:border-[#ded5c5] transition-colors active:scale-[0.98] shadow-sm"
          >
            <CircleHelp size={20} className="text-[#536574]" /> {t.help}
          </button>
        </motion.div>

        {/* Recent Transactions */}
        <motion.section variants={slideUp} className="mt-8" ref={activityRef}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#17324d]">{t.recent}</h2>
            <button
              onClick={() => nav("/dashboard?tab=activity")}
              className="text-xs font-bold text-[#b37b12] hover:underline"
            >
              {t.viewAll}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#fffdf8] border border-[#eee8db] shadow-sm">
            {isLoading && transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b7c68] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin text-[#e6a62d]" size={16} />
                {lang === "hi" ? "लेन-देन लोड हो रहा है..." : "Loading transactions..."}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b7c68]">
                {t.noTransactions}
              </div>
            ) : (
              transactions.map((tx, i) => {
                const isDebit = tx.type === "DEBIT" || tx.amount < 0;
                const formattedAmount = isDebit
                  ? `−₹${formatINR(Math.abs(tx.amount))}`
                  : `+₹${formatINR(tx.amount)}`;
                const amountColor = isDebit ? "#b65c4a" : "#5b936d";
                const icon = getCategoryIcon(tx.category);
                const relativeDate = formatRelativeDate(tx.date);

                return (
                  <motion.div
                    key={tx.id || tx.referenceId || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    className="flex items-center justify-between border-b border-[#eee8db] px-4 py-4 last:border-0 hover:bg-[#faf8f3] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1ede5] text-base shrink-0">
                        {icon}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-[#17324d]">
                          {tx.title}
                        </div>
                        <div className="text-xs text-[#8b7c68]">
                          {relativeDate}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-sm font-extrabold shrink-0"
                      style={{ color: amountColor }}
                    >
                      {formattedAmount}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>
      </motion.div>
      <BottomNav active={isActivityTab ? "activity" : "home"} />

      {/* Saathi AI Modals */}
      <SaathiChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      <PhoneCallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
      />
    </PageTransition>
  );
}
