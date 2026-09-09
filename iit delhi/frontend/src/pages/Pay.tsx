import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  Check,
  Loader2,
  QrCode,
  User,
  Phone,
  Store,
  Sparkles,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Top } from "../components/layout/Top";
import { useLang } from "../hooks/useLang";
import { PageTransition } from "../motion/pageTransitions";
import { initiatePayment } from "../lib/api";

interface RecipientOption {
  id: string;
  name: string;
  upiId: string;
  phone?: string;
  avatar: string;
  type: "MERCHANT" | "CONTACT" | "CUSTOM";
}

const PRESET_RECIPIENTS: RecipientOption[] = [
  {
    id: "rahul",
    name: "Rahul General Store",
    upiId: "rahul.store@upi",
    avatar: "🏪",
    type: "MERCHANT",
  },
  {
    id: "neha",
    name: "Neha Pharmacy",
    upiId: "neha.meds@upi",
    avatar: "💊",
    type: "MERCHANT",
  },
  {
    id: "sharma",
    name: "Sharma Electronics",
    upiId: "sharma.store@upi",
    avatar: "⚡",
    type: "MERCHANT",
  },
  {
    id: "amit",
    name: "Amit Cafe",
    upiId: "amit.cafe@upi",
    avatar: "☕",
    type: "MERCHANT",
  },
];

export default function Pay() {
  const [, nav] = useLocation();
  const searchString = useSearch();
  const { lang, t } = useLang();
  const isHindi = lang === "hi";

  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption>(PRESET_RECIPIENTS[0]);
  const [customInput, setCustomInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [amount, setAmount] = useState("500");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickAmounts = [100, 200, 500, 1000, 2000];

  // Parse query params (e.g. /pay?amount=500&recipient=8318365677 or Neha)
  useEffect(() => {
    if (!searchString) return;
    const params = new URLSearchParams(searchString);
    const amtParam = params.get("amount");
    const recParam = params.get("recipient") || params.get("to");

    if (amtParam && !isNaN(Number(amtParam))) {
      setAmount(amtParam);
    }

    if (recParam) {
      const clean = recParam.trim();
      const matched = PRESET_RECIPIENTS.find(
        (r) =>
          r.name.toLowerCase().includes(clean.toLowerCase()) ||
          r.upiId.toLowerCase().includes(clean.toLowerCase())
      );

      if (matched) {
        setSelectedRecipient(matched);
        setIsCustomMode(false);
      } else {
        // Set as custom number or UPI
        const isDigitsOnly = /^\d+$/.test(clean);
        const upi = isDigitsOnly ? `${clean}@upi` : clean.includes("@") ? clean : `${clean}@upi`;
        const displayName = isDigitsOnly ? `Contact (${clean})` : clean;
        const customRec: RecipientOption = {
          id: "custom",
          name: displayName,
          upiId: upi,
          phone: isDigitsOnly ? clean : undefined,
          avatar: isDigitsOnly ? "📱" : "👤",
          type: "CUSTOM",
        };
        setSelectedRecipient(customRec);
        setCustomInput(clean);
        setIsCustomMode(true);
      }
    }
  }, [searchString]);

  const handleCustomInputSubmit = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const isDigitsOnly = /^\d+$/.test(clean);
    const upi = isDigitsOnly ? `${clean}@upi` : clean.includes("@") ? clean : `${clean}@upi`;
    const displayName = isDigitsOnly ? `Mobile: ${clean}` : clean;

    const customRec: RecipientOption = {
      id: "custom",
      name: displayName,
      upiId: upi,
      phone: isDigitsOnly ? clean : undefined,
      avatar: isDigitsOnly ? "📱" : "👤",
      type: "CUSTOM",
    };
    setSelectedRecipient(customRec);
  };

  const handleReviewPayment = async () => {
    const numericAmount = parseInt(amount, 10);
    if (!numericAmount || numericAmount <= 0) {
      toast.error(isHindi ? "कृपया सही राशि दर्ज करें।" : "Please enter a valid amount.");
      return;
    }

    if (!selectedRecipient || !selectedRecipient.upiId) {
      toast.error(isHindi ? "कृपया प्राप्तकर्ता चुनें।" : "Please select a recipient.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await initiatePayment({
        recipientUpi: selectedRecipient.upiId,
        amount: numericAmount,
      });

      if (res.success && res.payment?.paymentId) {
        nav(`/pay/confirm?paymentId=${res.payment.paymentId}`);
      } else {
        toast.error(isHindi ? "भुगतान शुरू नहीं हो सका।" : "Payment could not be started.");
      }
    } catch (err: any) {
      console.error("[Pay] Initiate payment error:", err);
      if (err.message && err.message.includes("balance")) {
        toast.error(
          isHindi ? "आपके खाते में पर्याप्त राशि नहीं है।" : "Insufficient balance in your account."
        );
      } else {
        toast.error(
          err.message || (isHindi ? "भुगतान शुरू नहीं हो सका।" : "Payment could not be initiated.")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "पैसे भेजें" : "Send money"}
        onBack={() => nav("/dashboard")}
      />
      <div className="content-scroll flex flex-col pb-6">
        <span className="signal-notch" />
        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8b7c68]">
              {isHindi ? "चरण 1 / 2" : "Step 1 of 2"}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#17324d] tracking-[-.04em]">
              {isHindi ? "किसे भेजना है?" : "Who to send to?"}
            </h1>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff9e9] text-[#b37b12] border border-[#e6a62d]/40 shadow-sm">
            <QrCode size={22} />
          </div>
        </div>

        {/* Selected Recipient Card */}
        <div className="mt-5 rounded-2xl border-2 border-[#e6a62d] bg-[#fff9e9] p-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17324d] text-2xl shrink-0">
              {selectedRecipient.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="block text-base font-extrabold text-[#17324d] truncate">
                  {selectedRecipient.name}
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#5b936d] text-white shrink-0 shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>
              <span className="text-xs text-[#66717b] block truncate">
                UPI: {selectedRecipient.upiId}
              </span>
            </div>
          </div>
        </div>

        {/* Send to Any Number or UPI ID Input */}
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-[#8b7c68] block mb-1.5">
            {isHindi ? "किसी भी मोबाइल नंबर या UPI ID पर भेजें" : "Send to any Phone Number or UPI ID"}
          </label>
          <div className="flex items-center rounded-2xl border border-[#d9cfbe] bg-white px-3.5 focus-within:border-[#e6a62d] focus-within:ring-2 focus-within:ring-[#e6a62d]/20 transition-all shadow-xs">
            <Search size={18} className="text-[#8b7c68] shrink-0 mr-2" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => {
                const val = e.target.value;
                setCustomInput(val);
                if (val.trim().length >= 3) {
                  handleCustomInputSubmit(val);
                }
              }}
              placeholder={
                isHindi
                  ? "उदा. 8318365677 या name@upi दर्ज करें"
                  : "e.g. 8318365677 or user@upi"
              }
              className="h-12 w-full bg-transparent text-sm font-bold text-[#17324d] outline-none placeholder:text-[#a09485]"
            />
          </div>
        </div>

        {/* Preset Recipient Chips */}
        <div className="mt-3">
          <p className="text-[11px] font-bold text-[#8b7c68] mb-2 uppercase tracking-wide">
            {isHindi ? "त्वरित प्राप्तकर्ता (Quick Merchants)" : "Quick Recipients"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_RECIPIENTS.map((rec) => {
              const isSelected = selectedRecipient.upiId === rec.upiId;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    setSelectedRecipient(rec);
                    setCustomInput("");
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-[#e6a62d] bg-[#fff9e9] shadow-xs"
                      : "border-[#e4dccd] bg-white hover:bg-[#faf7ee]"
                  }`}
                >
                  <span className="text-xl">{rec.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#17324d] truncate">{rec.name}</p>
                    <p className="text-[10px] text-[#8b7c68] truncate">{rec.upiId}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <label className="mt-6 text-xs font-bold uppercase tracking-wider text-[#8b7c68]">
          {isHindi ? "कितना भेजना है?" : t.amount}
        </label>
        <div className="mt-2 flex items-center rounded-2xl border border-[#d9cfbe] bg-[#fffdf8] px-5 focus-within:border-[#e6a62d] focus-within:ring-2 focus-within:ring-[#e6a62d]/20 transition-all shadow-sm">
          <span className="text-3xl font-extrabold text-[#17324d]">₹</span>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            disabled={isSubmitting}
            className="min-h-[66px] w-full bg-transparent px-3 text-3xl font-extrabold outline-none text-[#17324d] placeholder:text-[#d9cfbe]"
          />
        </div>

        {/* Quick Amount Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              disabled={isSubmitting}
              onClick={() => setAmount(String(amt))}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 shadow-sm ${
                amount === String(amt)
                  ? "bg-[#17324d] text-[#fffdf8]"
                  : "bg-[#fffdf8] border border-[#e4dccd] text-[#66717b] hover:border-[#ded5c5]"
              }`}
            >
              +₹{amt}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-[#8b7c68]">
          {isHindi
            ? "अगली स्क्रीन पर स्वाइप करके सुरक्षित पुष्टि करें।"
            : "You’ll review with a swipe gesture on the next screen."}
        </p>

        <div className="mt-auto pt-8">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md active:scale-[0.98] transition-transform"
            disabled={!amount || parseInt(amount, 10) <= 0 || !selectedRecipient.upiId || isSubmitting}
            onClick={handleReviewPayment}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />{" "}
                {isHindi ? "भुगतान तैयार हो रहा है..." : "Preparing payment..."}
              </>
            ) : (
              <>
                {isHindi ? "भुगतान की समीक्षा करें" : "Review payment"}{" "}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
