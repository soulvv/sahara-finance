import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, Mic, Sparkles, Volume2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { PageTransition } from "../motion/pageTransitions";
import { useLang } from "../hooks/useLang";
import { slideUp, staggerContainer } from "../motion/variants";
import { createSupportTicket } from "../lib/api";

export default function Help() {
  const [, nav] = useLocation();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [step, setStep] = useState<"ready" | "listening" | "understood">(
    "ready"
  );
  const [isCreating, setIsCreating] = useState(false);

  const startListening = () => {
    setStep("listening");
    setTimeout(() => setStep("understood"), 2000);
  };

  const handleCreateTicket = async () => {
    setIsCreating(true);
    try {
      const res = await createSupportTicket({
        category: "FAILED_PAYMENT",
        reportedIssue: isHindi
          ? "राहुल जनरल स्टोर पर ₹500 का भुगतान विफल हो गया लेकिन पैसे कट गए।"
          : "Payment failed at Rahul General Store but money was deducted.",
        recordedViaVoice: true,
      });

      if (res.success && res.ticket?.ticketId) {
        nav(`/help/ticket?ticketId=${res.ticket.ticketId}`);
      } else {
        toast.error(isHindi ? "शिकायत दर्ज नहीं हो सकी।" : "Support request could not be created.");
      }
    } catch (err: any) {
      console.error("[Help] Ticket creation error:", err);
      toast.error(err.message || (isHindi ? "शिकायत दर्ज नहीं हो सकी।" : "Support request failed."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageTransition className="flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "सहायता और शिकायत" : "Help & support"}
        onBack={() => nav("/dashboard")}
      />
      <motion.div
        className="content-scroll flex flex-col pb-32"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <span className="signal-notch" />
        <motion.h1
          variants={slideUp}
          className="mt-7 text-3xl font-extrabold text-[#17324d]"
        >
          {isHindi ? "क्या परेशानी हुई?" : "What happened?"}
        </motion.h1>
        <motion.p variants={slideUp} className="mt-3 leading-7 text-[#66717b] text-sm">
          {isHindi
            ? "आप अपनी भाषा में बोलकर या लिखकर बताएं। हम 2 घंटे के भीतर समाधान करेंगे।"
            : "You can explain in your own words. We'll listen and help you find the next step."}
        </motion.p>

        {/* Voice-First Help Interface */}
        <motion.button
          variants={slideUp}
          className="mt-8 flex min-h-[120px] items-center gap-4 rounded-[24px] bg-[#17324d] p-5 text-left text-[#fffdf8] shadow-[0_12px_28px_rgba(230,166,45,.2)] transition-transform active:scale-[0.98]"
          onClick={step === "ready" ? startListening : undefined}
        >
          <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#e6a62d] text-[#17324d] shadow-sm">
            {step === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[#e6a62d] opacity-20" />
            )}
            {step === "understood" ? <Sparkles size={25} /> : <Mic size={25} />}
          </span>
          <span className="flex-1">
            <span className="block text-lg font-extrabold">
              {step === "ready" && (isHindi ? "बोलकर बताएं क्या समस्या है" : "Tell me what happened")}
              {step === "listening" && (isHindi ? "सुन रहा हूँ..." : "Listening...")}
              {step === "understood" && (isHindi ? "समझ गया।" : "I understand.")}
            </span>
            <span className="mt-1 block text-sm text-[#cbd8df]">
              {step === "ready" && (isHindi ? "हिन्दी या अंग्रेज़ी में बोलने के लिए टैप करें" : "Tap to speak in Hindi or English")}
              {step === "listening" && (isHindi ? '"मेरा ₹500 का पेमेंट अटक गया"' : '"Mera payment fail ho gaya"')}
              {step === "understood" && (isHindi ? "मैं आपकी इस शिकायत को तुरंत दर्ज करता हूँ।" : "Let me help you with this.")}
            </span>
            {step === "listening" && (
              <span className="mt-3 flex items-center gap-[2px]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-[#e6a62d]"
                    animate={{ height: [4, 8 + ((i * 5) % 16), 4] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4 + (i % 5) * 0.08,
                      delay: i * 0.04,
                    }}
                  />
                ))}
              </span>
            )}
          </span>
        </motion.button>

        {/* AI Response */}
        {step === "understood" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 space-y-4"
          >
            {/* AI's understanding */}
            <div className="rounded-2xl border border-[#e6a62d] bg-[#fff9e9] p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Volume2 className="text-[#b37b12] shrink-0 mt-0.5" size={19} />
                <div className="text-sm leading-6 text-[#17324d]">
                  <strong>
                    {isHindi
                      ? '"मैंने समझ लिया। क्या राहुल जनरल स्टोर पर ₹500 का भुगतान विफल हुआ था?"'
                      : '"I understand. Was the payment ₹500 to Rahul General Store?"'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Related transaction */}
            <div className="rounded-2xl bg-[#fffdf8] border border-[#e4dccd] p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8b7c68] mb-3">
                {isHindi ? "संबंधित लेन-देन" : "Related transaction"}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1ede5] text-sm shrink-0">
                    <ShoppingBag size={18} className="text-[#e07a5f]" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-[#17324d]">
                      Rahul General Store
                    </div>
                    <div className="text-xs text-[#8b7c68]">
                      {isHindi ? "हालिया · ₹500" : "Recent · ₹500"}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#b65c4a] bg-[#fdf2f0] px-2 py-0.5 rounded-md">
                  {isHindi ? "समीक्षा आवश्यक" : "Needs review"}
                </span>
              </div>
            </div>

            <button
              className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-50 font-bold shadow-md active:scale-[0.98] transition-transform"
              disabled={isCreating}
              onClick={handleCreateTicket}
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> {isHindi ? "शिकायत दर्ज हो रही है..." : "Creating ticket..."}
                </>
              ) : (
                isHindi ? "शिकायत दर्ज करें (2-घंटे SLA)" : "Create support ticket"
              )}
            </button>
          </motion.div>
        )}

        <div className="mt-auto pt-8">
          <button
            className="secondary-button w-full font-bold"
            onClick={() => nav("/help/status")}
          >
            {isHindi ? "पूर्व शिकायतों की स्थिति देखें" : "Check existing tickets"}{" "}
            <ChevronRight className="ml-2 inline" size={18} />
          </button>
        </div>
      </motion.div>
    </PageTransition>
  );
}
