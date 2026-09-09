import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  RotateCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { useAuthStore } from "../hooks/useAuth";
import { useLang } from "../hooks/useLang";
import { api, ApiError } from "../lib/api";
import { PageTransition } from "../motion/pageTransitions";

export default function Otp() {
  const [, nav] = useLocation();
  const { pendingAuth, setPendingAuth, login, isAuthenticated } = useAuthStore();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(pendingAuth?.retryAfterSeconds || 30);

  // If already authenticated, go directly to dashboard
  // If not authenticated and no pending session, redirect to login
  useEffect(() => {
    if (isAuthenticated) {
      nav("/dashboard");
      return;
    }
    if (!pendingAuth?.phone || !pendingAuth?.requestId) {
      nav("/login");
    }
  }, [pendingAuth, isAuthenticated, nav]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (codeToVerify?: string) => {
    const finalOtp = codeToVerify || otp;
    if (finalOtp.length !== 6 || !pendingAuth || loading) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        token: string;
        user: {
          id: string;
          phone: string;
          name: string | null;
          preferredLanguage: "hi" | "hinglish" | "en";
          onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
          kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
        };
        nextRoute: "/onboarding" | "/dashboard";
      }>("/api/auth/verify-otp", {
        phone: pendingAuth.phone,
        otp: finalOtp,
        requestId: pendingAuth.requestId,
        name: pendingAuth.name,
      });

      if (res.success && res.token) {
        login(res.token, res.user);
        toast.success(isHindi ? "मोबाइल नंबर सत्यापित हुआ!" : "Mobile verified successfully!");
        nav(res.nextRoute || "/dashboard");
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        toast.error(err.message);
      } else {
        const fallback = isHindi
          ? "सत्यापन विफल रहा। कृपया कोड जांचें और पुनः प्रयास करें।"
          : "Verification failed. Please check the code and try again.";
        setErrorMsg(fallback);
        toast.error(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !pendingAuth?.phone) return;
    setResending(true);
    setErrorMsg(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        requestId: string;
        retryAfterSeconds: number;
        expiresInSeconds: number;
        otpLength: number;
        demoOtp?: string;
      }>("/api/auth/send-otp", { phone: pendingAuth.phone });

      if (res.success) {
        setPendingAuth({
          phone: pendingAuth.phone,
          requestId: res.requestId,
          demoOtp: res.demoOtp,
          retryAfterSeconds: res.retryAfterSeconds,
        });
        setCooldown(res.retryAfterSeconds || 30);
        setOtp("");

        if (res.demoOtp) {
          toast.success(isHindi ? `नया ओटीपी: ${res.demoOtp}` : `New Demo OTP: ${res.demoOtp}`, {
            description: isHindi ? "नया परीक्षण कोड बन गया है।" : "DEMO MODE: New test code generated.",
            duration: 8000,
          });
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        toast.error(err.message);
      }
    } finally {
      setResending(false);
    }
  };

  const fillDemoCode = () => {
    if (pendingAuth?.demoOtp) {
      setOtp(pendingAuth.demoOtp);
      setErrorMsg(null);
      handleVerify(pendingAuth.demoOtp);
    }
  };

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "नंबर का सत्यापन" : "Verify your number"}
        onBack={() => nav("/login")}
      />
      <div className="content-scroll flex flex-col pb-6">
        <span className="signal-notch" />
        <h1 className="mt-6 text-3xl font-extrabold text-[#17324d] tracking-[-.04em]">
          {isHindi ? "6-अंकों का कोड दर्ज करें।" : "Enter the 6-digit code."}
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-[#66717b]">
          {isHindi
            ? `सुरक्षित सत्यापन कोड ${pendingAuth?.phone || ""} के लिए तैयार किया गया है।`
            : `A secure verification code was generated for ${pendingAuth?.phone || ""}.`}
        </p>

        {/* Demo Mode Notice Box */}
        {pendingAuth?.demoOtp && (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-[#e6a62d] bg-[#fff9e9] p-4 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6a62d] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#17324d]">
                <Sparkles size={12} /> {isHindi ? "फ्री डेमो मोड" : "Free Demo Mode"}
              </span>
              <button
                type="button"
                onClick={fillDemoCode}
                className="text-xs font-bold text-[#b37b12] hover:underline cursor-pointer"
              >
                {isHindi ? "ऑटो-फिल एवं सत्यापित करें" : "Auto-fill & Verify"}
              </button>
            </div>
            <div className="mt-2 text-sm text-[#66717b]">
              {isHindi ? "आपका टेस्ट ओटीपी कोड है: " : "Your test OTP is: "}
              <strong className="font-mono text-xl tracking-widest text-[#17324d]">
                {pendingAuth.demoOtp}
              </strong>
            </div>
            <p className="mt-1 text-[11px] text-[#8b7c68]">
              {isHindi
                ? "कोई एसएमएस शुल्क नहीं है। नीचे यह कोड डालें या ऑटो-फिल दबाएं।"
                : "No paid SMS is sent. Enter this test code below or tap Auto-fill to proceed."}
            </p>
          </div>
        )}

        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={otp}
          disabled={loading}
          onChange={e => {
            const clean = e.target.value.replace(/\D/g, "");
            setOtp(clean);
            if (errorMsg) setErrorMsg(null);
            if (clean.length === 6) {
              handleVerify(clean);
            }
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && otp.length === 6 && !loading) {
              handleVerify();
            }
          }}
          className="mt-6 w-full rounded-2xl border-2 border-[#e4dccd] bg-[#fffdf8] p-5 text-center text-3xl font-extrabold tracking-[.4em] outline-none focus:border-[#e6a62d] focus:ring-4 focus:ring-[#e6a62d]/20 transition-all text-[#17324d] shadow-sm placeholder:tracking-normal placeholder:text-[#d9cfbe]"
          placeholder="••••••"
        />

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-[#f3dfd8] border border-[#b65c4a]/30 p-3 text-xs text-[#b65c4a] flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resend OTP Row */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#8b7c68] px-1">
          <span>{isHindi ? "कोड नहीं मिला?" : "Didn't get the code?"}</span>
          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            className="flex items-center gap-1 font-bold text-[#b37b12] hover:text-[#17324d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RotateCw size={13} className={resending ? "animate-spin" : ""} />
            {resending
              ? (isHindi ? "नया कोड बन रहा है..." : "Generating...")
              : cooldown > 0
              ? (isHindi ? `${cooldown}s में दोबारा भेजें` : `Resend in ${cooldown}s`)
              : (isHindi ? "नया कोड भेजें" : "Resend demo code")}
          </button>
        </div>

        <div className="mt-auto pt-8">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md active:scale-[0.98] transition-transform"
            disabled={otp.length !== 6 || loading}
            onClick={() => handleVerify()}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {isHindi ? "सत्यापन हो रहा है..." : "Verifying..."}
              </>
            ) : (
              <>
                {isHindi ? "सत्यापित करें और आगे बढ़ें" : "Verify & continue"} <ArrowRight size={18} />
              </>
            )}
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#3c6f53]">
            <ShieldCheck size={14} /> {isHindi ? "सुरक्षित एवं त्वरित सत्यापन" : "Free instant verification for hackathon"}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
