import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Globe2, ShieldCheck, Sparkles, Mic, Wallet, Landmark } from "lucide-react";
import { Brand } from "../components/layout/Brand";
import { PageTransition } from "../motion/pageTransitions";
import { slideUp, staggerContainer } from "../motion/variants";
import { useLang } from "../hooks/useLang";

export default function Welcome() {
  const [, nav] = useLocation();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 shrink-0">
        <Brand />
        <button
          onClick={() => nav("/language")}
          className="flex items-center gap-1.5 text-xs font-bold text-[#66717b] hover:text-[#17324d] transition-colors bg-[#fffdf8] px-3 py-1.5 rounded-full border border-[#e4dccd] shadow-sm"
        >
          <Globe2 size={15} className="text-[#b37b12]" /> {isHindi ? "भाषा बदलें" : "भाषा / Language"}
        </button>
      </div>

      <motion.div
        className="flex flex-1 flex-col px-6 pt-4 pb-5"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Trust Badge */}
        <motion.div
          variants={slideUp}
          className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e9f0ea] px-3.5 py-1.5 text-xs font-bold text-[#3c6f53] shrink-0 shadow-sm"
        >
          <ShieldCheck size={16} /> {isHindi ? "सुरक्षित, सरल, आपके साथ" : "Safe, simple, with you"}
        </motion.div>

        {/* Hero Typography */}
        <motion.h1
          variants={slideUp}
          className="max-w-[430px] text-[clamp(2.1rem,8.5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-.05em] text-[#17324d] shrink-0"
        >
          {isHindi ? (
            <>
              पैसों की मदद,
              <br />
              <span className="text-[#b37b12]">जो आपकी सुनती है।</span>
            </>
          ) : (
            <>
              Money help
              <br />
              <span className="text-[#b37b12]">that listens.</span>
            </>
          )}
        </motion.h1>

        <motion.p
          variants={slideUp}
          className="mt-2.5 max-w-[340px] text-sm leading-6 text-[#66717b] shrink-0"
        >
          {isHindi
            ? "भुगतान, ऋण और बचत के लिए आपका अपना डिजिटल साथी — आपकी पसंदीदा भाषा में।"
            : "Your friendly guide for payments, savings, loans and more — in the language you speak."}
        </motion.p>

        {/* Crisp Vector Card Showcase (Replaces AI Image) */}
        <motion.div
          variants={slideUp}
          className="mt-4 my-auto flex flex-col items-center justify-center shrink relative"
        >
          <div className="w-full max-w-[340px] rounded-[24px] bg-gradient-to-br from-[#17324d] to-[#24425f] p-5 text-white shadow-[0_16px_36px_rgba(23,50,77,.2)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e6a62d]/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e6a62d] text-[#17324d]">
                  <Wallet size={16} />
                </span>
                <span className="text-xs font-bold text-[#cbd8df]">Sahara Vault</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-extrabold text-[#e6a62d] bg-white/10 px-2.5 py-1 rounded-full">
                <Sparkles size={11} /> Saathi AI
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-[#cbd8df]">
                {isHindi ? "कुल उपलब्ध शेष" : "Available Balance"}
              </span>
              <div className="text-3xl font-extrabold tracking-tight mt-0.5">
                ₹8,420<span className="text-lg opacity-70">.00</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#bfe0c4]">
              <span className="flex items-center gap-1.5 font-medium">
                <Landmark size={14} /> {isHindi ? "सूक्ष्म ऋण सक्रिय" : "Active Micro-Loan"}
              </span>
              <span className="flex items-center gap-1 text-[#e6a62d] font-bold">
                <Mic size={14} className="animate-pulse" /> {isHindi ? "आवाज़ से सक्रिय" : "Voice Ready"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={slideUp}
          className="mt-auto pt-3 space-y-2.5 shrink-0"
        >
          <button
            className="primary-button flex w-full items-center justify-center gap-2 text-base font-bold shadow-md active:scale-[0.98] transition-transform"
            onClick={() => nav("/language")}
          >
            {isHindi ? "शुरू करें" : "Let’s begin"} <ArrowRight size={18} />
          </button>
          <p className="text-center text-[11px] font-semibold text-[#8b7c68]">
            {isHindi ? "इस डेमो के लिए किसी बैंक खाते की आवश्यकता नहीं है" : "No bank details needed for this demo"}
          </p>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
