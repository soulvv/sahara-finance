import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, ShieldCheck, Volume2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Top } from "../components/layout/Top";
import { PageTransition } from "../motion/pageTransitions";
import { SwipeConfirm } from "../components/ui/SwipeConfirm";
import { useCountUp, formatINR } from "../hooks/useCountUp";
import { useNetworkStore } from "../lib/network";
import { useLang } from "../hooks/useLang";
import { slideUp } from "../motion/variants";
import {
  getPaymentDetails,
  initiatePayment,
  executePayment,
  PaymentIntent,
} from "../lib/api";

// three.js is downloaded only when this screen is first shown
const VaultScene = lazy(() => import("../three/VaultScene"));

export default function Confirm() {
  const [, nav] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const paymentIdParam = searchParams.get("paymentId");
  const amountParam = parseInt(searchParams.get("amount") || "500", 10);
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(paymentIdParam);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback if no initial payment object is loaded
  const displayAmount = payment ? payment.amount : amountParam;
  const balance = payment?.accountBalance ?? 8420;
  const remaining = payment?.estimatedRemainingBalance ?? Math.max(balance - displayAmount, 0);
  const remainingDisplay = useCountUp(remaining, 1000);

  const online = useNetworkStore(s => s.online);

  const loadPaymentInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (paymentIdParam) {
        const res = await getPaymentDetails(paymentIdParam);
        if (res.success && res.payment) {
          setPayment(res.payment);
          setActivePaymentId(res.payment.paymentId);
        }
      } else {
        // Fallback initiation if accessed directly via URL with amount
        const initRes = await initiatePayment({
          recipientUpi: "rahul.store@upi",
          amount: amountParam,
        });
        if (initRes.success && initRes.payment) {
          setPayment(initRes.payment);
          setActivePaymentId(initRes.payment.paymentId);
        }
      }
    } catch (err: any) {
      console.error("[Confirm] Error loading payment details:", err);
      const msg = isHindi ? "भुगतान विवरण लोड नहीं हो सका।" : (err.message || "Unable to load payment details.");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [paymentIdParam, amountParam, isHindi]);

  useEffect(() => {
    loadPaymentInfo();
  }, [loadPaymentInfo]);

  const handleConfirm = async () => {
    if (!activePaymentId || isExecuting) return;

    setIsExecuting(true);
    setError(null);

    // Generate unique idempotency key
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const res = await executePayment({
        paymentId: activePaymentId,
        idempotencyKey,
      });

      if (res.success) {
        setConfirmed(true);
        setTimeout(() => {
          nav(`/pay/success?paymentId=${activePaymentId}`);
        }, 600);
      } else {
        throw new Error("Payment execution failed.");
      }
    } catch (err: any) {
      console.error("[Confirm] Execution error:", err);
      const errMsg =
        err.message && err.message.includes("balance")
          ? (isHindi ? "आपके खाते में पर्याप्त राशि नहीं है।" : "Insufficient balance in your account.")
          : (isHindi ? "भुगतान पूरा नहीं हो सका।" : (err.message || "Payment execution failed."));
      setError(errMsg);
      toast.error(errMsg);
      setIsExecuting(false);
      setConfirmed(false);
    }
  };

  const merchantName = payment?.merchant?.name || "Rahul General Store";
  const merchantUpi = payment?.merchant?.upiId || "rahul.store@upi";

  return (
    <PageTransition className="flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "भुगतान की पुष्टि करें" : "Check before sending"}
        onBack={() => nav("/pay")}
      />
      <div className="content-scroll flex flex-col relative overflow-hidden pb-32">
        <span className="signal-notch" />
        <motion.h1
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="mt-7 text-3xl font-extrabold relative z-10 text-[#17324d]"
        >
          {isHindi ? "पहले जांच लेते हैं।" : "Let's check details."}
        </motion.h1>
        <motion.p
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="mt-3 leading-7 text-[#66717b] relative z-10 text-sm"
        >
          {isHindi
            ? "जब तक आप नीचे स्वाइप नहीं करेंगे, कोई पैसा नहीं कटेगा।"
            : "Nothing will be sent until you confirm with a swipe."}
        </motion.p>

        {/* Subtle 3D Vault Background */}
        <div className="absolute top-[30%] right-[-15%] w-64 h-64 pointer-events-none opacity-15 z-0 mix-blend-multiply">
          <Suspense fallback={null}>
            <VaultScene open={!confirmed} />
          </Suspense>
        </div>

        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-[#fdf2f0] border border-[#f3dfd8] p-4 text-xs font-bold text-[#b65c4a] relative z-10"
          >
            {error}
          </motion.div>
        )}

        {/* Transaction Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 rounded-[24px] bg-[#fffdf8] p-5 shadow-[0_8px_22px_rgba(55,42,21,.07)] relative z-10 border border-[#e4dccd]"
        >
          <div className="flex items-center gap-4 border-b border-[#eee8db] pb-5">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#17324d] font-extrabold text-[#e6a62d] text-lg shadow-sm">
              {merchantName.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </span>
            <div>
              <div className="font-extrabold text-[#17324d]">
                {merchantName}
              </div>
              <div className="text-sm text-[#8b7c68]">UPI · {merchantUpi}</div>
            </div>
          </div>

          {/* Amount — the visual focal point */}
          <div className="py-7 text-center">
            <div className="text-sm font-semibold text-[#8b7c68]">
              {isHindi ? "भेजी जाने वाली राशि" : "You are sending"}
            </div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mt-1 text-5xl font-extrabold tracking-[-.06em] text-[#17324d]"
            >
              {isLoading ? (
                <span className="opacity-40 animate-pulse">₹···</span>
              ) : (
                `₹${formatINR(displayAmount)}`
              )}
            </motion.div>
          </div>

          {/* Remaining balance preview */}
          <div className="border-t border-[#eee8db] pt-4 text-center">
            <div className="text-xs font-semibold text-[#8b7c68]">
              {isHindi ? "भुगतान के बाद शेष राशि" : "Estimated balance after payment"}
            </div>
            <div className="mt-1 text-xl font-extrabold text-[#17324d]">
              {isLoading ? (
                <span className="opacity-40 animate-pulse">₹··,···</span>
              ) : (
                `₹${formatINR(remainingDisplay)}`
              )}
            </div>
          </div>

          {/* AI reading confirmation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex items-start gap-3 rounded-xl bg-[#fff9e9] border border-[#e6a62d]/30 p-3 text-sm text-[#17324d]"
          >
            <Volume2 size={18} className="mt-0.5 shrink-0 text-[#b37b12]" />
            <div>
              <span className="font-bold">
                {isHindi
                  ? `आप ₹${formatINR(displayAmount)} ${merchantName} को भेज रहे हैं।`
                  : `You are sending ₹${formatINR(displayAmount)} to ${merchantName}.`}
              </span>
              <br />
              <span className="text-[#8b7c68] text-xs">
                {isHindi ? "सहारा साथी द्वारा सत्यापित" : "OmniDimension confirms your payment"}
              </span>
            </div>
          </motion.div>

          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#e9f0ea] p-3 text-sm font-semibold text-[#356449]">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>
              {isHindi
                ? "आपका भुगतान सुरक्षित है। पुष्टि के लिए नीचे स्लाइड करें।"
                : "Your payment is protected by a final confirmation swipe."}
            </span>
          </div>
        </motion.div>

        {/* Offline guard */}
        {!online && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#f3dfd8] p-3 text-sm font-semibold text-[#b65c4a] relative z-10">
            <WifiOff size={18} className="mt-0.5 shrink-0" />
            <span>
              {isHindi
                ? "आप ऑफ़लाइन हैं। इंटरनेट जुड़ने पर भुगतान जारी रहेगा।"
                : "You're offline. Payments need a connection — nothing has been sent."}
            </span>
          </div>
        )}

        {/* Swipe to Confirm Gesture */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`mt-6 relative z-10 ${!online || isLoading || isExecuting ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isExecuting ? (
            <div className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-[#17324d] font-extrabold text-[#fffdf8]">
              <Loader2 className="animate-spin" size={18} /> {isHindi ? "भुगतान हो रहा है..." : "Processing payment..."}
            </div>
          ) : (
            <SwipeConfirm onConfirm={handleConfirm} disabled={!online || isLoading || isExecuting} />
          )}
        </motion.div>

        <button
          className="secondary-button mt-3 w-full relative z-10"
          disabled={isExecuting}
          onClick={() => nav("/pay")}
        >
          {isHindi ? "राशि बदलें" : "Change details"}
        </button>
      </div>
    </PageTransition>
  );
}
