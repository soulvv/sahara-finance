import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight, BadgeCheck, Clock, Loader2, RefreshCw } from "lucide-react";
import { Top } from "../components/layout/Top";
import { useLang } from "../hooks/useLang";
import { PageTransition } from "../motion/pageTransitions";
import { getSupportTicket, getUserTickets, SupportTicketItem } from "../lib/api";

export default function Ticket() {
  const [, nav] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const ticketIdParam = searchParams.get("ticketId");
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const [ticket, setTicket] = useState<SupportTicketItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (ticketIdParam) {
        const res = await getSupportTicket(ticketIdParam);
        if (res.success && res.ticket) {
          setTicket(res.ticket);
        }
      } else {
        const listRes = await getUserTickets(1);
        if (listRes.success && listRes.tickets?.length > 0) {
          setTicket(listRes.tickets[0]);
        }
      }
    } catch (err: any) {
      console.error("[Ticket] Error loading ticket:", err);
      setError(isHindi ? "शिकायत विवरण लोड नहीं हो सका।" : "Ticket details could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketIdParam, isHindi]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  const ticketNumber = ticket?.ticketId || ticketIdParam || "SAH-2026-8392";
  const statusDisplay = ticket?.status === "RESOLVED"
    ? (isHindi ? "समाधान पूर्ण" : "Resolved")
    : (isHindi ? "जांच जारी" : "In Review");
  const slaText = isHindi ? "2 घंटे" : (ticket?.estimatedResolutionTime || "2 hours");
  const reportedIssue = ticket?.reportedIssue || (isHindi ? "भुगतान समीक्षाधीन है" : "Payment issue under review");

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "शिकायत स्थिति" : "Support ticket"}
        onBack={() => nav("/help")}
      />
      <div className="content-scroll flex flex-col pb-6">
        <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-[26px] bg-[#e9f0ea] text-[#3c6f53] shadow-sm">
          <BadgeCheck size={40} />
        </div>
        <h1 className="mt-5 text-center text-3xl font-extrabold text-[#17324d] tracking-[-.04em]">
          {isHindi ? "आपकी शिकायत दर्ज हो गई है" : t.ticket}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-[#66717b] max-w-[320px] mx-auto">
          {isHindi
            ? `सहारा सहायता टीम आपकी समस्या की जांच कर रही है। अनुमानित समाधान समय ${slaText} है।`
            : `A dedicated Sahara support specialist is reviewing your issue. Estimated resolution time is ${slaText}.`}
        </p>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fdf2f0] border border-[#f3dfd8] p-4 text-xs font-bold text-[#b65c4a]">
            <span>{error}</span>
            <button
              onClick={loadTicketData}
              className="flex items-center gap-1 underline font-extrabold text-[#b65c4a] ml-2"
            >
              <RefreshCw size={12} /> {t.tryAgain}
            </button>
          </div>
        )}

        {/* Ticket Details Card */}
        <div className="mt-7 rounded-[22px] bg-[#fffdf8] p-5 border border-[#e4dccd] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#eee8db] pb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b7c68]">
                {isHindi ? "शिकायत संख्या (ID)" : "Ticket ID"}
              </div>
              <div className="mt-0.5 text-lg font-mono font-extrabold text-[#17324d]">
                {isLoading ? (
                  <span className="opacity-40 animate-pulse">SAH-2026-····</span>
                ) : (
                  ticketNumber
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff9e9] border border-[#e6a62d]/40 px-3 py-1 text-xs font-bold text-[#b37b12]">
              <span className="h-2 w-2 rounded-full bg-[#e6a62d] animate-pulse" />
              {statusDisplay}
            </span>
          </div>

          <div className="text-xs space-y-2.5 text-[#66717b]">
            <div className="flex justify-between">
              <span>{isHindi ? "दर्ज समस्या:" : "Reported Issue:"}</span>
              <strong className="text-[#17324d] max-w-[190px] text-right truncate">
                {reportedIssue}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{isHindi ? "अनुमानित समय:" : "Estimated Resolution:"}</span>
              <strong className="text-[#17324d] flex items-center gap-1">
                <Clock size={12} /> {slaText}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{isHindi ? "माध्यम:" : "Recorded via:"}</span>
              <strong className="text-[#17324d]">
                {isHindi ? "सहारा साथी वॉइस असिस्टेंट" : "OmniDimension Voice Assistant"}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98] transition-transform"
            onClick={() => nav("/dashboard")}
          >
            {isHindi ? "मुख्य पृष्ठ पर जाएं" : "Back to home"} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
