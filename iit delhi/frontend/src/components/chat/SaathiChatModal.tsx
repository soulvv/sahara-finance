import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  sendChatMessage,
  confirmAiAction,
  WebsiteAction,
} from "../../lib/api";
import { useAuthStore } from "../../hooks/useAuth";
import { useLang } from "../../hooks/useLang";
import { dispatchWebsiteAction } from "../../services/voiceActions";
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  actions?: WebsiteAction[];
  timestamp: string;
}

interface SaathiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const SaathiChatModal: React.FC<SaathiChatModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
}) => {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { lang, t } = useLang();

  const isHindi = lang === "hi";

  const getInitialGreeting = () => {
    const name = user?.name ? user.name.split(" ")[0] : "";
    if (isHindi) {
      return name
        ? `नमस्ते ${name}! 🙏 मैं सहारा साथी हूँ। आपको खाता सेटअप, बैलेंस, लोन या भुगतान में क्या सहायता चाहिए?`
        : "नमस्ते! 🙏 मैं सहारा साथी हूँ। आपको खाता सेटअप, बैलेंस, लोन या भुगतान में क्या सहायता चाहिए?";
    }
    return name
      ? `Namaste ${name}! 🙏 Main Saathi hoon. Aapko account setup, balance, loan ya payment mein kya madad chahiye?`
      : "Namaste! 🙏 Main Saathi hoon. Aapko account setup, balance, loan ya payment mein kya madad chahiye?";
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: "msg_welcome",
          sender: "assistant",
          text: getInitialGreeting(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [isOpen, lang, user?.name]);

  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt !== input) {
      handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setActionFeedback(null);

    try {
      const response = await sendChatMessage(messageText, {
        language: user?.preferredLanguage || lang || "hinglish",
        onboardingStatus: user?.onboardingStatus,
      });

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        actions: response.actions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-execute low-risk actions (e.g. language change or simple navigation)
      if (response.actions && response.actions.length > 0) {
        for (const act of response.actions) {
          if (!act.requiresConfirmation) {
            const res = dispatchWebsiteAction(act, setLocation);
            if (res.feedbackMessage) {
              setActionFeedback(res.feedbackMessage);
            }
          }
        }
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "assistant",
        text: isHindi
          ? "माफ़ कीजिए, अभी सर्वर से कनेक्ट करने में परेशानी आ रही है। कृपया थोड़ी देर बाद प्रयास करें।"
          : "Maaf kijiye, abhi server se connect nahi ho pa raha. Kripya thodi der baad try karein.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (action: WebsiteAction, confirmed: boolean) => {
    try {
      const result = await confirmAiAction({
        actionId: action.actionId,
        confirmed,
        actionType: action.type,
        payload: action.payload,
      });
      if (confirmed && result.success) {
        const dispatchRes = dispatchWebsiteAction(action, setLocation);
        setActionFeedback(dispatchRes.feedbackMessage || (isHindi ? "कार्य पूर्ण हुआ" : "Action executed"));
      } else {
        setActionFeedback(isHindi ? "कार्य रद्द किया गया" : "Action cancelled");
      }
    } catch (err) {
      setActionFeedback(isHindi ? "पुष्टि करने में विफल" : "Failed to confirm action");
    }
  };

  if (!isOpen) return null;

  const quickPills = isHindi
    ? [
        "मुझे अकाउंट बनाना नहीं आता",
        "KYC क्या होता है?",
        "मेरा बैलेंस कितना है?",
        "लोन समझाओ",
        "मेरी भाषा बदलो",
      ]
    : [
        "Account setup mein help karo",
        "KYC kya hota hai?",
        "Mera balance kitna hai?",
        "Loan details dikhao",
        "Hindi mein karo",
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#fffdf8] w-full max-w-md h-[580px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#e8ded2]">
        {/* Header */}
        <div className="bg-[#17324d] text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6a62d] text-[#17324d] flex items-center justify-center font-bold text-sm shadow-sm">
              <Sparkles className="w-5 h-5 text-[#17324d]" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-1.5 text-white">
                Sahara Saathi <span className="text-xs text-[#e6a62d]">● Live AI</span>
              </h2>
              <p className="text-xs text-[#cbd8df]">
                {isHindi ? "बहुभाषी डिजिटल वित्तीय सहायक" : "Multilingual financial companion"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Execution Banner */}
        {actionFeedback && (
          <div className="bg-[#e9f0ea] border-b border-[#c5d9c9] px-4 py-2 text-xs text-[#356449] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#356449] shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Chat Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-[#17324d] text-[#fcfaf6] rounded-br-none"
                    : "bg-white text-[#17324d] border border-[#e8ded2] rounded-bl-none"
                }`}
              >
                <p>{msg.text}</p>

                {/* Structured Action Cards */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-[#f0e6d8]">
                    {msg.actions.map((act) => (
                      <div
                        key={act.actionId}
                        className="p-3 bg-[#f7f2ea] rounded-xl border border-[#e2d5c3] text-xs"
                      >
                        <div className="font-semibold text-[#17324d] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#e07a5f]" />
                            {act.type}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#8c6b4e]">
                            {act.riskLevel} Risk
                          </span>
                        </div>

                        {act.requiresConfirmation ? (
                          <div className="mt-2.5 space-y-2">
                            <p className="text-[#594738]">
                              {act.userPromptMessage || (isHindi ? "कृपया इस कार्य की पुष्टि करें:" : "Please confirm this action:")}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmAction(act, true)}
                                className="flex-1 py-1.5 px-3 bg-[#2b6e56] text-white font-medium rounded-lg text-xs hover:bg-[#235845] transition-colors"
                              >
                                {isHindi ? "हाँ, आगे बढ़ें" : "Haan, proceed"}
                              </button>
                              <button
                                onClick={() => handleConfirmAction(act, false)}
                                className="py-1.5 px-3 bg-[#e8ded2] text-[#423225] font-medium rounded-lg text-xs hover:bg-[#d9ccbd] transition-colors"
                              >
                                {isHindi ? "रद्द करें" : "Cancel"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[#705e4f]">
                              {act.payload?.route ? `Screen: ${act.payload.route}` : "Executed"}
                            </span>
                            {act.payload?.route && (
                              <button
                                onClick={() => {
                                  dispatchWebsiteAction(act, setLocation);
                                  onClose();
                                }}
                                className="flex items-center gap-1 text-[#e07a5f] font-semibold hover:underline"
                              >
                                {isHindi ? "खोलें" : "Go Now"} <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#9c8a7a] mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#705e4f] p-2">
              <div className="w-2 h-2 rounded-full bg-[#e6a62d] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#e6a62d] animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-[#e6a62d] animate-bounce [animation-delay:0.4s]" />
              <span>{isHindi ? "साथी सोच रही है..." : "Saathi soch rahi hai..."}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 border-t border-[#ebd8c5] bg-[#faf5ed] overflow-x-auto flex gap-2 no-scrollbar">
          {quickPills.map((pill, i) => (
            <button
              key={i}
              onClick={() => handleSend(pill)}
              className="text-xs shrink-0 px-3 py-1.5 bg-white border border-[#e2d5c3] text-[#4a392b] rounded-full hover:border-[#e6a62d] hover:text-[#b37b12] transition-all font-medium shadow-sm"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#e8ded2]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isHindi ? "साथी से कुछ भी बोलें या लिखें..." : "Saathi se kuch bhi boliye ya type karein..."}
              className="flex-1 px-4 py-2.5 bg-[#f8f4eb] border border-[#e2d5c3] rounded-2xl text-sm text-[#17324d] placeholder-[#9c8a7a] focus:outline-none focus:ring-2 focus:ring-[#e6a62d]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-[#17324d] text-[#fcfaf6] rounded-2xl disabled:opacity-40 hover:bg-[#24425f] transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
