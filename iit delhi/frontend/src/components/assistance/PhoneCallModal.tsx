import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { requestPhoneCall, getPhoneCallStatus, completeCallLogin } from "../../lib/api";
import { useAuthStore } from "../../hooks/useAuth";
import { Phone, PhoneCall, CheckCircle, AlertCircle, X, Shield, Clock, Sparkles, UserCheck, ArrowRight } from "lucide-react";

interface PhoneCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialName?: string;
  reason?: string;
  isLoginCall?: boolean;
  onLoginSuccess?: (token: string, user: any, nextRoute?: string) => void;
}

export const PhoneCallModal: React.FC<PhoneCallModalProps> = ({
  isOpen,
  onClose,
  initialPhone = "",
  initialName = "",
  reason = "ASSISTED_ONBOARDING",
  isLoginCall = false,
  onLoginSuccess,
}) => {
  const [, nav] = useLocation();
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completingLogin, setCompletingLogin] = useState(false);

  const getInitialCleanPhone = () => {
    if (initialPhone) {
      return initialPhone.replace(/^\+91/, "").replace(/\D/g, "");
    }
    if (user?.phone) {
      return user.phone.replace(/^\+91/, "").replace(/\D/g, "");
    }
    return "";
  };

  const [phoneInput, setPhoneInput] = useState(getInitialCleanPhone);
  const [nameInput, setNameInput] = useState(initialName || user?.name || "");

  useEffect(() => {
    if (isOpen) {
      setPhoneInput(getInitialCleanPhone());
      setNameInput(initialName || user?.name || "");
      setCallId(null);
      setCallStatus(null);
      setMessage(null);
      setError(null);
      setCompletingLogin(false);
    }
  }, [isOpen, initialPhone, initialName, user]);

  const handlePerformLoginTransition = (token: string, authUser: any) => {
    login(token, authUser);
    toast.success(
      authUser?.name
        ? `नमस्ते ${authUser.name}! साथी वॉइस लॉगिन सफल हुआ।`
        : "साथी वॉइस लॉगिन सफल हुआ!"
    );
    const nextRoute = authUser?.onboardingStatus === "COMPLETED" ? "/dashboard" : "/onboarding";
    if (onLoginSuccess) {
      onLoginSuccess(token, authUser, nextRoute);
    } else {
      nav(nextRoute);
    }
    onClose();
  };

  const handleRequestCall = async () => {
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formatted = `+91${cleanPhone.slice(-10)}`;
      const effectiveReason = isLoginCall ? "VOICE_LOGIN_ASSISTANCE" : reason;
      const res = await requestPhoneCall(
        effectiveReason,
        undefined,
        formatted,
        nameInput.trim() || undefined,
        isLoginCall
      );
      setCallId(res.callId);
      setCallStatus(res.status || "RINGING");
      setMessage(res.message);

      // If token already generated on login call, auto log in after short greeting delay
      if (isLoginCall && res.loginAuthToken && res.user) {
        setTimeout(() => {
          handlePerformLoginTransition(res.loginAuthToken!, res.user);
        }, 3500);
      }
    } catch (err: any) {
      setError(
        err.message ||
          "फोन कॉल का अनुरोध पूरा नहीं हो सका। कृपया पुनः प्रयास करें।"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualCompleteLogin = async () => {
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।");
      return;
    }

    setCompletingLogin(true);
    setError(null);
    try {
      const formatted = `+91${cleanPhone.slice(-10)}`;
      const res = await completeCallLogin(callId || undefined, formatted, nameInput.trim() || undefined);
      if (res.success && res.token && res.user) {
        handlePerformLoginTransition(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || "लॉगिन पूरा नहीं हो सका। कृपया दोबारा प्रयास करें।");
    } finally {
      setCompletingLogin(false);
    }
  };

  // Poll call status
  useEffect(() => {
    if (!callId || callStatus === "COMPLETED" || callStatus === "FAILED") return;

    const interval = setInterval(async () => {
      try {
        const res = await getPhoneCallStatus(callId);
        if (res.success && res.call) {
          setCallStatus(res.call.status);
          // If login call is authenticated via voice session
          if (isLoginCall && res.call.loginAuthToken && res.call.user) {
            clearInterval(interval);
            handlePerformLoginTransition(res.call.loginAuthToken, res.call.user);
          }
        }
      } catch {
        /* non-fatal */
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [callId, callStatus, isLoginCall]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#fcfaf6] border border-[#e8ded2] rounded-3xl shadow-2xl overflow-hidden p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#705e4f] hover:text-[#2d2218] rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="text-center space-y-4 pt-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e07a5f]/15 text-[#e07a5f] flex items-center justify-center shadow-inner">
            {callId ? (
              <PhoneCall className="w-8 h-8 animate-pulse text-[#2b6e56]" />
            ) : isLoginCall ? (
              <Sparkles className="w-8 h-8 text-[#e07a5f]" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#2d2218]">
              {isLoginCall ? "साथी से कॉल पर लॉगिन करें" : "Saathi Phone Assistance"}
            </h3>
            <p className="text-xs text-[#705e4f] mt-1 max-w-xs mx-auto">
              {isLoginCall
                ? "अपना नाम और मोबाइल नंबर दर्ज करें। साथी आपको सीधे कॉल करेगी और आपका खाता स्वतः लॉगिन हो जाएगा।"
                : "आप जिस नंबर पर कॉल चाहते हैं, यहाँ दर्ज करें। साथी सीधे आपको कॉल करके गाइड करेगी।"}
            </p>
          </div>

          {/* Form Inputs */}
          <div className="p-3.5 bg-[#f5ecdf] rounded-2xl border border-[#e2d5c3] text-left space-y-3">
            {/* Name Input */}
            <div>
              <label className="text-xs font-semibold text-[#705e4f] block mb-1">
                आपका पूरा नाम / Your Name:
              </label>
              <div className="flex items-center rounded-xl border border-[#d9cfbe] bg-[#fffdf8] px-3 focus-within:border-[#e07a5f] focus-within:ring-2 focus-within:ring-[#e07a5f]/20 transition-all shadow-sm">
                <input
                  type="text"
                  value={nameInput}
                  disabled={Boolean(callId) || loading}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="उदा. शुभम सिंह / Shubham Singh"
                  className="w-full bg-transparent px-1 py-2 text-sm font-semibold outline-none text-[#2d2218] placeholder:text-[#b3aa9c]"
                />
              </div>
            </div>

            {/* Mobile Number Input */}
            <div>
              <label className="text-xs font-semibold text-[#705e4f] block mb-1">
                10 अंकों का मोबाइल नंबर / Mobile Number:
              </label>
              <div className="flex items-center rounded-xl border border-[#d9cfbe] bg-[#fffdf8] px-3 focus-within:border-[#e07a5f] focus-within:ring-2 focus-within:ring-[#e07a5f]/20 transition-all shadow-sm">
                <span className="border-r border-[#e4dccd] pr-2.5 font-bold text-[#2d2218] text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneInput}
                  disabled={Boolean(callId) || loading}
                  onChange={(e) => {
                    setPhoneInput(e.target.value.replace(/\D/g, ""));
                    if (error) setError(null);
                  }}
                  placeholder="10 digit number"
                  className="w-full bg-transparent px-2.5 py-2.5 text-base font-bold outline-none text-[#2d2218] placeholder:text-[#b3aa9c] tracking-wider"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#2b6e56] pt-0.5">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>सुरक्षित और 100% मुफ़्त सहारा वॉइस कनेक्शन</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && !error && (
            <div className="p-3 bg-[#81b29a]/20 border border-[#81b29a]/40 rounded-xl text-xs text-[#1e523f] flex items-center gap-2 text-left animate-in slide-in-from-top">
              <CheckCircle className="w-4 h-4 shrink-0 text-[#2b6e56]" />
              <span>{message}</span>
            </div>
          )}

          {callStatus && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#594738] py-1 bg-[#ede4d8]/60 rounded-xl border border-[#dfd4c5]">
              <Clock className="w-3.5 h-3.5 text-[#e07a5f] animate-spin" />
              <span>कॉल स्थिति: <strong className="text-[#e07a5f] uppercase tracking-wider">{callStatus}</strong></span>
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            {!callId ? (
              <button
                onClick={handleRequestCall}
                disabled={loading || phoneInput.length < 10}
                className="w-full py-3.5 px-4 bg-[#2d2218] text-[#fcfaf6] font-bold rounded-2xl shadow-lg hover:bg-[#423225] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Phone className="w-4 h-4" />
                {loading
                  ? "कॉल मिला रहे हैं..."
                  : isLoginCall
                  ? `कॉल से लॉगिन शुरू करें (+91 ${phoneInput || "..."})`
                  : `इस नंबर पर कॉल मँगवाएँ (+91 ${phoneInput || "..."})`}
              </button>
            ) : (
              <>
                {isLoginCall && (
                  <button
                    onClick={handleManualCompleteLogin}
                    disabled={completingLogin}
                    className="w-full py-3.5 px-4 bg-[#2b6e56] text-white font-bold rounded-2xl shadow-lg hover:bg-[#235845] transition-all flex items-center justify-center gap-2 text-sm animate-pulse"
                  >
                    <UserCheck className="w-4 h-4" />
                    {completingLogin ? "खाता खोल रहे हैं..." : "✅ कॉल पर बात हो गई — लॉगिन पूरा करें"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-[#e8ded2] text-[#2d2218] font-bold rounded-2xl hover:bg-[#d8cbbe] transition-all text-xs"
                >
                  विंडो बंद करें (Close)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
