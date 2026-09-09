import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  ChevronRight,
  Globe2,
  LockKeyhole,
  LogOut,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { BottomNav } from "../components/layout/BottomNav";
import { useLang } from "../hooks/useLang";
import { useAuthStore } from "../hooks/useAuth";
import { PageTransition } from "../motion/pageTransitions";
import { Lang } from "../lib/i18n";
import { updateMyProfile } from "../lib/api";

export default function Profile() {
  const [, nav] = useLocation();
  const { lang, setLang, t } = useLang();
  const { user, logout, updateUser, refreshProfile } = useAuthStore();

  const isHindi = lang === "hi";

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const displayName = user?.name || (isHindi ? "खाता धारक" : "Account Holder");
  const displayPhone = user?.phone
    ? user.phone.length === 13
      ? `${user.phone.slice(0, 3)} XXXXX ${user.phone.slice(-4)}`
      : user.phone
    : "+91 XXXXX 43210";

  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLangToggle = async () => {
    const next = lang === "hinglish" ? "hi" : lang === "hi" ? "en" : "hinglish";
    setLang(next as Lang);
    updateUser({ preferredLanguage: next as "hi" | "hinglish" | "en" });

    try {
      await updateMyProfile({ preferredLanguage: next as "hi" | "hinglish" | "en" });
      toast.success(
        next === "hi"
          ? "भाषा बदलकर हिन्दी कर दी गई है"
          : `Language switched to ${next.toUpperCase()}`
      );
    } catch {
      toast("Language updated locally");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success(isHindi ? "सफलतापूर्वक लॉग आउट हो गया" : "Logged out successfully");
    nav("/login");
  };

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top title={isHindi ? "मेरी प्रोफ़ाइल" : "Your profile"} />
      <div className="content-scroll pb-28">
        {/* User Card */}
        <div className="mt-4 flex items-center gap-4 rounded-[24px] bg-[#fffdf8] p-5 border border-[#e4dccd] shadow-sm">
          <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#17324d] text-xl font-extrabold text-[#e6a62d] shadow-sm shrink-0">
            {initials || "RK"}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#17324d]">
              {displayName}
            </h1>
            <p className="text-xs text-[#66717b] mt-0.5">{displayPhone}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e9f0ea] px-2.5 py-0.5 text-[11px] font-bold text-[#3c6f53]">
              <ShieldCheck size={12} />{" "}
              {user?.kycStatus === "VERIFIED"
                ? (isHindi ? "केवाईसी सत्यापित" : "KYC Verified")
                : (isHindi ? "केवाईसी लंबित" : "KYC Pending")}
            </span>
          </div>
        </div>

        {/* Settings List */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleLangToggle}
            className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#fffdf8] border border-[#e4dccd] px-5 text-left transition-all active:scale-[0.98] hover:bg-[#faf8f3] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff9e9] text-[#b37b12]">
                <Globe2 size={18} />
              </span>
              <div>
                <span className="block font-bold text-[#17324d] text-sm">
                  {isHindi ? "ऐप की भाषा" : "App Language"}
                </span>
                <span className="text-xs text-[#8b7c68]">
                  {isHindi ? "बोलने और पढ़ने की भाषा बदलें" : "Change spoken and display language"}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#b37b12]">
              {lang === "hi"
                ? "हिन्दी"
                : lang === "en"
                  ? "English"
                  : "Hinglish"}
              <ChevronRight size={16} />
            </span>
          </button>

          <button
            onClick={() =>
              toast.info(
                isHindi
                  ? "सहारा साथी वॉइस असिस्टेंट हमेशा सक्रिय है"
                  : "OmniDimension Voice Assistant is always active"
              )
            }
            className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#fffdf8] border border-[#e4dccd] px-5 text-left transition-all active:scale-[0.98] hover:bg-[#faf8f3] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9f0ea] text-[#3c6f53]">
                <Mic size={18} />
              </span>
              <div>
                <span className="block font-bold text-[#17324d] text-sm">
                  {isHindi ? "वॉइस गाइडेंस (आवाज़ से मदद)" : "Voice Guidance"}
                </span>
                <span className="text-xs text-[#8b7c68]">
                  {isHindi ? "क्षेत्रीय भाषा और एआई सहायता" : "Vernacular speech and AI assistance"}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-[#3c6f53]">
              {isHindi ? "सक्रिय" : "Active"}
              <ChevronRight size={16} />
            </span>
          </button>

          <button
            onClick={() =>
              toast.info(
                isHindi
                  ? "आपका वित्तीय डेटा 256-बिट एन्क्रिप्शन द्वारा सुरक्षित है"
                  : "Your financial data is protected by 256-bit encryption"
              )
            }
            className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#fffdf8] border border-[#e4dccd] px-5 text-left transition-all active:scale-[0.98] hover:bg-[#faf8f3] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1ede5] text-[#536574]">
                <LockKeyhole size={18} />
              </span>
              <div>
                <span className="block font-bold text-[#17324d] text-sm">
                  {isHindi ? "सुरक्षा एवं गोपनीयता" : "Security & Privacy"}
                </span>
                <span className="text-xs text-[#8b7c68]">
                  {isHindi ? "सहमति प्रबंधन एवं डेटा सुरक्षा" : "Consent management & data protection"}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#b3aa9c]" />
          </button>

          <button
            onClick={handleLogout}
            className="flex min-h-[68px] w-full items-center justify-between rounded-2xl bg-[#fffdf8] border border-[#f3dfd8] px-5 text-left transition-all active:scale-[0.98] hover:bg-[#fbf4f1] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3dfd8] text-[#b65c4a]">
                <LogOut size={18} />
              </span>
              <div>
                <span className="block font-bold text-[#b65c4a] text-sm">
                  {isHindi ? "लॉग आउट करें" : "Log Out"}
                </span>
                <span className="text-xs text-[#8b7c68]">
                  {isHindi ? "इस सत्र को समाप्त करें" : "End this authenticated session"}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#b65c4a]" />
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-[#8b7c68]">
          Sahara Finance v1.0.0 · Smart India Hackathon 2026
        </div>
      </div>
      <BottomNav active="profile" />
    </PageTransition>
  );
}
