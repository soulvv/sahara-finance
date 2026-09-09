import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, AlertCircle, Loader2, LockKeyhole, ShieldCheck, PhoneCall, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { PhoneCallModal } from "../components/assistance/PhoneCallModal";
import { useLang } from "../hooks/useLang";
import { useAuthStore } from "../hooks/useAuth";
import { api, ApiError } from "../lib/api";
import { PageTransition } from "../motion/pageTransitions";

export default function Login() {
  const [, nav] = useLocation();
  const { lang, t } = useLang();
  const { setPendingAuth, pendingAuth } = useAuthStore();
  const [name, setName] = useState(() => pendingAuth?.name || "");
  const [phone, setPhone] = useState(() => {
    if (pendingAuth?.phone) {
      return pendingAuth.phone.replace(/^\+91/, "");
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const isHindi = lang === "hi";

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;
      const res = await api.post<{
        success: boolean;
        message: string;
        requestId: string;
        retryAfterSeconds: number;
        expiresInSeconds: number;
        otpLength: number;
        demoOtp?: string;
      }>("/api/auth/send-otp", { phone: formattedPhone });

      if (res.success) {
        setPendingAuth({
          phone: formattedPhone,
          name: name.trim() || null,
          requestId: res.requestId,
          demoOtp: res.demoOtp,
          retryAfterSeconds: res.retryAfterSeconds,
        });

        if (res.demoOtp) {
          toast.success(isHindi ? `डेमो ओटीपी कोड: ${res.demoOtp}` : `Demo OTP generated: ${res.demoOtp}`, {
            description: isHindi ? "अगली स्क्रीन पर इस कोड का उपयोग करें।" : "DEMO MODE: Use this code on the next screen.",
            duration: 8000,
          });
        }

        nav("/otp");
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        toast.error(err.message);
      } else {
        const fallback = isHindi ? "सहारा सर्वर से कनेक्ट नहीं हो सका। कृपया पुनः प्रयास करें।" : "Unable to connect to Sahara backend. Please try again.";
        setErrorMsg(fallback);
        toast.error(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "लॉगिन / खाता खोलें" : "Login or Register"}
        onBack={() => nav("/language")}
      />
      <div className="content-scroll flex flex-col pb-6">
        <span className="signal-notch" />
        <h1 className="mt-5 text-3xl font-extrabold tracking-[-.04em] text-[#17324d]">
          {isHindi ? "सहारा में आपका स्वागत है।" : "Welcome to Sahara."}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#66717b]">
          {isHindi
            ? "अपना नाम और मोबाइल नंबर दर्ज करें। आप ओटीपी या साथी से सीधे फोन कॉल द्वारा भी लॉगिन कर सकते हैं।"
            : "Enter your name and mobile number. You can verify via OTP or instantly login via a phone call with Saathi."}
        </p>

        {/* Name Input */}
        <div className="mt-6">
          <label className="text-xs font-bold uppercase tracking-wider text-[#8b7c68] flex items-center gap-1.5 mb-1.5">
            <User size={13} className="text-[#e07a5f]" />
            {isHindi ? "आपका पूरा नाम (वैकल्पिक)" : "Full Name (Optional / Recommended)"}
          </label>
          <div className="flex items-center rounded-2xl border border-[#d9cfbe] bg-[#fffdf8] px-4 focus-within:border-[#e6a62d] focus-within:ring-2 focus-within:ring-[#e6a62d]/20 transition-all shadow-sm">
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={isHindi ? "उदा. शुभम सिंह / Shubham Singh" : "e.g. Shubham Singh"}
              disabled={loading}
              className="min-h-[52px] flex-1 bg-transparent text-base font-bold outline-none text-[#17324d] placeholder:text-[#b3aa9c]"
            />
          </div>
        </div>

        {/* Mobile Number Input */}
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-[#8b7c68] block mb-1.5">
            {isHindi ? "10 अंकों का मोबाइल नंबर *" : "Mobile Number (10 digits) *"}
          </label>
          <div className="flex items-center rounded-2xl border border-[#d9cfbe] bg-[#fffdf8] px-4 focus-within:border-[#e6a62d] focus-within:ring-2 focus-within:ring-[#e6a62d]/20 transition-all shadow-sm">
            <span className="border-r border-[#e4dccd] pr-3 font-bold text-[#17324d] text-base">
              +91
            </span>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={e => {
                setPhone(e.target.value.replace(/\D/g, ""));
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && phone.length === 10 && !loading) {
                  handleSendOtp();
                }
              }}
              placeholder={isHindi ? "10 अंकों का मोबाइल नंबर" : "10 digit number"}
              disabled={loading}
              className="min-h-[54px] flex-1 bg-transparent px-3 text-xl font-bold outline-none text-[#17324d] placeholder:text-[#b3aa9c] tracking-wider"
            />
          </div>
        </div>

        {/* Voice Call Assisted Login Feature Banner */}
        <div className="mt-5 p-4 bg-gradient-to-r from-[#fcf5eb] to-[#f7ede2] border border-[#e2d2be] rounded-2xl flex flex-col gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e07a5f] text-white flex items-center justify-center shrink-0 shadow-md">
              <PhoneCall size={20} className="animate-bounce" />
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold text-[#17324d]">
                  {isHindi ? "साथी से कॉल पर लॉगिन करें" : "Login via Voice Call"}
                </p>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#e07a5f]/15 text-[#e07a5f] rounded-md flex items-center gap-1">
                  <Sparkles size={10} /> AI Voice
                </span>
              </div>
              <p className="text-xs text-[#705e4f] mt-0.5 leading-relaxed">
                {isHindi
                  ? "टाइप करने की जरूरत नहीं! साथी आपको कॉल करेगी और आपका खाता सीधे वेबसाइट पर खुल जाएगा।"
                  : "No typing required! Saathi calls your phone and logs you right into your dashboard."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCallModalOpen(true)}
            className="w-full py-2.5 px-4 bg-[#2d2218] hover:bg-[#433325] text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2"
          >
            <PhoneCall size={14} className="text-[#e07a5f]" />
            {isHindi
              ? (phone.length === 10 ? `+91 ${phone} पर कॉल से लॉगिन करें` : "साथी से कॉल मँगवाएँ")
              : (phone.length === 10 ? `Login via Call (+91 ${phone})` : "Get Call to Login")}
          </button>
        </div>

        {errorMsg ? (
          <div className="mt-4 rounded-xl bg-[#f3dfd8] border border-[#b65c4a]/30 p-3 text-xs text-[#b65c4a] flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-[#e9f0ea] p-3 text-xs text-[#3c6f53] flex items-center gap-2 shadow-sm">
            <ShieldCheck size={16} className="shrink-0" />
            <span>{isHindi ? "सुरक्षित व निजी: आपका डेटा 100% एन्क्रिप्टेड है।" : "Secure & Private: Your information is 100% encrypted."}</span>
          </div>
        )}

        <div className="mt-auto pt-6 space-y-3">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md active:scale-[0.98] transition-transform"
            disabled={phone.length < 10 || loading}
            onClick={handleSendOtp}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {isHindi ? "ओटीपी कोड बन रहा है..." : "Generating code..."}
              </>
            ) : (
              <>
                {isHindi ? "ओटीपी कोड से आगे बढ़ें" : "Continue with OTP"} <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-[#8b7c68]">
            <LockKeyhole size={13} className="text-[#b37b12]" /> {isHindi ? "256-बिट बैंक-ग्रेड सुरक्षा" : "Bank-grade encryption"}
          </p>
        </div>
      </div>

      <PhoneCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        initialPhone={phone ? `+91${phone}` : ""}
        initialName={name}
        isLoginCall={true}
        reason="VOICE_LOGIN_ASSISTANCE"
      />
    </PageTransition>
  );
}
