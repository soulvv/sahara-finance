import React from "react";
import { motion } from "framer-motion";
import { Mic, MessageSquare, Phone, ArrowRight, Sparkles, Shield, UserCheck } from "lucide-react";
import { useAuthStore } from "../../hooks/useAuth";
import { useLang } from "../../hooks/useLang";

interface SaathiFrontDoorProps {
  onStartVoice: () => void;
  onStartChat: () => void;
  onStartCall: () => void;
  onManualSetup: () => void;
}

export const SaathiFrontDoor: React.FC<SaathiFrontDoorProps> = ({
  onStartVoice,
  onStartChat,
  onStartCall,
  onManualSetup,
}) => {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const isHindi = lang === "hi";

  const firstName = user?.name ? user.name.split(" ")[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full rounded-3xl border border-[#e4d6c3] bg-gradient-to-b from-[#fffefc] to-[#fbf7ee] p-6 shadow-xl overflow-hidden"
    >
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#e07a5f]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#e6a62d]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#e07a5f]/15 text-[#e07a5f] border border-[#e07a5f]/30 shadow-xs">
          <Sparkles size={13} className="animate-spin" />
          {isHindi ? "सहारा डिजिटल साथी" : "Sahara Saathi Assistant"}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2b6e56]">
          <Shield size={12} />
          {isHindi ? "सुरक्षित बैंकिंग" : "Secure Banking"}
        </span>
      </div>

      {/* Main Salutation */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17324d] tracking-tight leading-tight">
        {isHindi
          ? `नमस्ते${firstName ? ` ${firstName} जी` : ""}! 👋`
          : `Namaste${firstName ? ` ${firstName}` : ""}! 👋`}
      </h2>
      <p className="mt-1.5 text-base sm:text-lg font-bold text-[#4a3b2c]">
        {isHindi
          ? "खाता सेटअप में मदद चाहिए?"
          : "Account setup mein madad chahiye?"}
      </p>
      <p className="text-xs sm:text-sm text-[#705e4f] mt-1 leading-relaxed">
        {isHindi
          ? "आपको ऐप सीखने की ज़रूरत नहीं है। बस बोलें, चैट करें या कॉल मँगवाएँ — साथी सब कुछ आसान बना देगी।"
          : "You don't need to learn the app first. Just talk, chat, or get a call — Saathi will guide you."}
      </p>

      {/* Assistance Cards (3 Primary Channels) */}
      <div className="mt-5 space-y-3">
        {/* 1. Talk to Saathi (Web Voice) */}
        <motion.button
          whileHover={{ scale: 1.015, x: 2 }}
          whileTap={{ scale: 0.985 }}
          onClick={onStartVoice}
          className="w-full p-4 rounded-2xl bg-white hover:bg-[#fff9f2] border-2 border-[#e07a5f]/40 hover:border-[#e07a5f] text-left flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e07a5f] text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <Mic size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#17324d]">
                  {isHindi ? "🎙️ साथी से बोलकर बात करें" : "🎙️ Talk to Saathi"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#e07a5f]/15 text-[#e07a5f]">
                  {isHindi ? "लाइव आवाज़" : "Web Voice"}
                </span>
              </div>
              <p className="text-xs text-[#705e4f] mt-0.5">
                {isHindi
                  ? "माइक से सीधे हिंदी या हिंग्लिश में बोलें"
                  : "Speak directly in Hindi or English"}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#e07a5f] group-hover:translate-x-1 transition-transform shrink-0" />
        </motion.button>

        {/* 2. Chat with Saathi */}
        <motion.button
          whileHover={{ scale: 1.015, x: 2 }}
          whileTap={{ scale: 0.985 }}
          onClick={onStartChat}
          className="w-full p-4 rounded-2xl bg-white hover:bg-[#fbf9f4] border border-[#e2d5c3] hover:border-[#e6a62d] text-left flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e6a62d] text-[#17324d] flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#17324d]">
                  {isHindi ? "💬 साथी के साथ चैट करें" : "💬 Chat with Saathi"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#e6a62d]/20 text-[#8a5d0d]">
                  {isHindi ? "इंटरैक्टिव" : "Interactive"}
                </span>
              </div>
              <p className="text-xs text-[#705e4f] mt-0.5">
                {isHindi
                  ? "टाइप करें या दिए गए बटन दबाएँ"
                  : "Type questions or use quick suggestion buttons"}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#8a5d0d] group-hover:translate-x-1 transition-transform shrink-0" />
        </motion.button>

        {/* 3. Call Me (Phone Telephony) */}
        <motion.button
          whileHover={{ scale: 1.015, x: 2 }}
          whileTap={{ scale: 0.985 }}
          onClick={onStartCall}
          className="w-full p-4 rounded-2xl bg-white hover:bg-[#f3f9f6] border border-[#e2d5c3] hover:border-[#2b6e56] text-left flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2b6e56] text-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <Phone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#17324d]">
                  {isHindi ? "📞 मुझे फोन पर कॉल करें" : "📞 Call me"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2b6e56]/15 text-[#2b6e56]">
                  {isHindi ? "फ़ोन कॉल" : "Phone Call"}
                </span>
              </div>
              <p className="text-xs text-[#705e4f] mt-0.5">
                {isHindi
                  ? "साथी सीधे आपके मोबाइल नंबर पर कॉल करेगी"
                  : "Saathi calls your mobile directly to guide you"}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#2b6e56] group-hover:translate-x-1 transition-transform shrink-0" />
        </motion.button>
      </div>

      {/* Elegant Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e2d5c3]" />
        </div>
        <span className="relative bg-[#fbf7ee] px-4 text-xs font-bold text-[#8b7c68] uppercase tracking-wider">
          {isHindi ? "या फिर" : "OR"}
        </span>
      </div>

      {/* Manual Stepper Bypass Option */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onManualSetup}
        className="w-full py-3.5 px-4 rounded-2xl bg-[#ece3d4] hover:bg-[#e4d8c6] border border-[#d8cbba] text-[#2d2218] font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
      >
        <UserCheck size={17} className="text-[#705e4f]" />
        <span>
          {isHindi ? "👉 मैं खुद सेटअप करूँगा / करूँगी" : "👉 Main khud setup karunga"}
        </span>
      </motion.button>
    </motion.div>
  );
};
