import { useState, useEffect } from "react";
import { ShieldCheck, ChevronRight, HelpCircle, HeartPulse, Sparkles, X, Info } from "lucide-react";
import { useLang } from "../../hooks/useLang";

export function SafeToSpendCard({ balance }: { balance: number }) {
  const { lang } = useLang();
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<any>(null);
  const [isLoadingExpl, setIsLoadingExpl] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/intelligence/safe-to-spend", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error(err));

    fetch("/api/intelligence/health-score", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setHealth(res.data);
      })
      .catch((err) => console.error(err));
  }, [balance]);

  const fetchExplanation = async () => {
    setShowExplanation(true);
    setIsLoadingExpl(true);
    try {
      const res = await fetch(`/api/ai/explain-screen?screen=safetospend&lang=${lang}`);
      const json = await res.json();
      if (json.success) {
        setExplanation(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingExpl(false);
    }
  };

  const safeAmount = data?.safeToSpend ?? Math.max(0, balance - 3800);
  const reservedAmount = data?.reservedTotal ?? 3800;

  return (
    <div className="mt-4 rounded-3xl bg-gradient-to-br from-[#17324d] to-[#254b73] p-5 text-[#fffdf8] shadow-lg border border-[#e6a62d]/20 relative overflow-hidden">
      {/* Background Subtle Wave Decoration */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-[#e6a62d]/10 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#e6a62d]/20 text-[#e6a62d]">
            <ShieldCheck size={16} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#e6a62d]">
            {lang === "hi" ? "सुरक्षित खर्च" : "Safe-to-Spend"}
          </span>
        </div>

        <button
          onClick={fetchExplanation}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#cbd8df] hover:bg-white/20 transition-colors"
        >
          <HelpCircle size={12} />
          {lang === "hi" ? "समझाएं" : "Explain"}
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">
            ₹{safeAmount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#cbd8df] mt-0.5">
            {lang === "hi"
              ? "बिल और क़िस्त के बाद उपलब्ध खर्च"
              : "Available after upcoming bills & EMIs"}
          </p>
        </div>

        {health && (
          <div className="text-right">
            <div className="inline-flex items-center gap-1 rounded-lg bg-[#3c6f53]/30 px-2 py-0.5 text-xs font-bold text-green-300 border border-[#3c6f53]/50">
              <HeartPulse size={12} /> {health.overallScore}/100
            </div>
            <p className="text-[10px] text-green-300/80 mt-0.5">
              {lang === "hi" ? "स्वास्थ्य स्कोर" : "Wellness Score"}
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar Showing Safe vs Reserved */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] font-semibold text-[#cbd8df] mb-1">
          <span>Safe: ₹{safeAmount.toLocaleString("en-IN")}</span>
          <span className="text-[#e8924a]">Reserved: ₹{reservedAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden flex">
          <div
            className="h-full bg-[#2a8c7a] transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.round((safeAmount / Math.max(1, balance)) * 100))}%`,
            }}
          />
          <div
            className="h-full bg-[#e8924a] transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.round((reservedAmount / Math.max(1, balance)) * 100))}%`,
            }}
          />
        </div>
      </div>

      <button
        onClick={() => setShowBreakdown(true)}
        className="mt-3.5 w-full flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-[#cbd8df] hover:bg-white/15 transition-colors"
      >
        <span>
          {lang === "hi" ? "आरक्षित फंड का ब्यौरा देखें" : "View reserved funds breakdown"}
        </span>
        <ChevronRight size={14} />
      </button>

      {/* Breakdown Modal */}
      {showBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#17324d] p-5 text-white shadow-2xl border border-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#e6a62d]">
                <Info size={16} /> Reserved Funds Breakdown
              </div>
              <button onClick={() => setShowBreakdown(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#cbd8df]">
              These funds are safely set aside so you never miss a loan installment or utility bill:
            </p>

            <div className="mt-4 space-y-2 text-xs">
              {(data?.reservedBreakdown || [
                { label: "Upcoming Loan EMI", amount: 1800 },
                { label: "Electricity bill (est.)", amount: 1200 },
                { label: "Emergency reserve", amount: 2600 },
              ]).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center rounded-xl bg-white/5 p-2.5">
                  <span className="font-semibold text-[#cbd8df]">{item.label}</span>
                  <span className="font-bold text-amber-300">₹{item.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs font-bold">
              <span>Total Reserved:</span>
              <span className="text-[#e8924a]">₹{reservedAmount.toLocaleString("en-IN")}</span>
            </div>

            <button
              onClick={() => setShowBreakdown(false)}
              className="mt-4 w-full rounded-xl bg-[#e6a62d] py-2.5 text-xs font-bold text-[#17324d]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* AI Screen Explanation Modal */}
      {showExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#17324d] p-5 text-white shadow-2xl border border-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#2a8c7a]">
                <Sparkles size={16} /> {explanation?.title || "Screen Explanation"}
              </div>
              <button onClick={() => setShowExplanation(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {isLoadingExpl ? (
              <div className="py-6 text-center text-xs text-white/60">Loading explanation...</div>
            ) : explanation ? (
              <div className="mt-3 space-y-3 text-xs">
                <p className="text-[#cbd8df] leading-relaxed">{explanation.summary}</p>
                <div className="space-y-1.5 rounded-xl bg-white/5 p-3">
                  {explanation.keyPoints?.map((pt: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-[#cbd8df]">
                      <span className="text-[#e6a62d]">•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
                {explanation.suggestedVoicePrompt && (
                  <div className="rounded-xl bg-[#e6a62d]/10 p-2.5 text-[11px] text-[#e6a62d] border border-[#e6a62d]/20">
                    <b>Try saying:</b> "{explanation.suggestedVoicePrompt}"
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={() => setShowExplanation(false)}
              className="mt-4 w-full rounded-xl bg-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
