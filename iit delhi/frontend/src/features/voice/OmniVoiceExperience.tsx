import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Landmark,
  LifeBuoy,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Wallet,
  X,
  Volume2,
  Phone,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useVoiceStore, VoiceState } from "./VoiceContext";
import { audioAnalyzer } from "./audioAnalyzer";
import { resolveAction, dispatchWebsiteAction } from "../../services/voiceActions";
import { cancelSpeech, delay, speak } from "../../services/speech";
import { useLang } from "../../hooks/useLang";
import { sendChatMessage, WebsiteAction } from "../../lib/api";

// three.js is downloaded only when the voice sheet is first opened
const VoiceScene = lazy(() => import("../../three/VoiceScene"));

const stateLabels: Partial<Record<VoiceState, string>> = {
  idle: "Ready to listen",
  awakening: "Connecting to Saathi...",
  connecting: "Connecting...",
  listening: "Listening to you...",
  processing: "Understanding...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  action: "Action ready",
  confirmation: "Please confirm",
  success: "Done!",
  error: "Something went wrong",
  offline: "You're offline",
};

export function OmniVoiceExperience() {
  const {
    isOpen,
    state,
    setOpen,
    setState,
    transcript,
    setTranscript,
    contextualHelp,
    setContextualHelp,
    actionIntent,
    setActionIntent,
  } = useVoiceStore();
  const { lang } = useLang();
  const [, nav] = useLocation();
  const isHindi = lang === "hi";

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isQueryingRef = useRef(false);

  const [aiReplyText, setAiReplyText] = useState("");
  const [proposedAction, setProposedAction] = useState<WebsiteAction | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Process query with OmniDimension Gateway
  const handleQuery = useCallback(
    async (queryText: string) => {
      const clean = queryText.trim();
      if (!clean || isQueryingRef.current) return;

      isQueryingRef.current = true;
      clearTimeouts();
      cancelSpeech();

      // Stop speech recognition while processing and speaking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      setIsMicActive(false);

      setState("processing");
      setTranscript(clean);
      setContextualHelp(isHindi ? "समझ रही हूँ..." : "Understanding you...");
      audioAnalyzer.stopSimulation();

      try {
        const res = await sendChatMessage(clean, {
          language: isHindi ? "hi" : "hinglish",
          currentRoute: window.location.pathname,
        });

        if (res.success && res.reply) {
          setAiReplyText(res.reply);
          setState("speaking");
          setContextualHelp(isHindi ? "साथी बोल रही है..." : "Saathi is speaking...");
          audioAnalyzer.startSimulation();

          const firstAction = res.actions?.[0] || null;
          setProposedAction(firstAction);

          const speechLang = isHindi ? "hi-IN" : "en-IN";
          await Promise.all([speak(res.reply, speechLang), delay(1500)]);

          audioAnalyzer.stopSimulation();
          setState("action");
          setContextualHelp("");

          if (firstAction) {
            scheduleTimeout(() => {
              dispatchWebsiteAction(firstAction, nav);
            }, 1000);
          }
        } else {
          setState("idle");
          setContextualHelp(isHindi ? "कुछ और पूछें" : "Ask something else");
        }
      } catch (err) {
        console.error("[OmniVoiceExperience] Voice error:", err);
        setState("idle");
        setContextualHelp(isHindi ? "कृपया दोबारा बोलें" : "Please try again");
      } finally {
        isQueryingRef.current = false;
      }
    },
    [clearTimeouts, isHindi, nav, scheduleTimeout, setContextualHelp, setState, setTranscript]
  );

  // Start speech recognition cleanly without flapping
  const startListening = useCallback(async () => {
    if (isQueryingRef.current) return;
    cancelSpeech();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      console.warn("[Voice] Mic permission warning:", err);
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsMicActive(false);
      setState("idle");
      setContextualHelp(isHindi ? "माइक सपोर्ट नहीं है, नीचे टैप करें" : "Mic unavailable, tap a prompt below");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false; // Single utterance mode prevents flapping!
      recognition.interimResults = true;
      recognition.lang = isHindi ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsMicActive(true);
        setState("listening");
        setContextualHelp(isHindi ? "आप बोलिए, मैं सुन रही हूँ..." : "Listening to you...");
        audioAnalyzer.startSimulation();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }

        const activeText = (finalTranscript || interimTranscript).trim();
        if (activeText) {
          setTranscript(activeText);

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          silenceTimerRef.current = setTimeout(() => {
            if (activeText.length >= 2 && !isQueryingRef.current) {
              handleQuery(activeText);
            }
          }, 1100);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice] Speech recognition error:", event.error);
        setIsMicActive(false);
        audioAnalyzer.stopSimulation();
      };

      recognition.onend = () => {
        setIsMicActive(false);
        audioAnalyzer.stopSimulation();
      };

      recognition.start();
    } catch (err) {
      console.warn("[Voice] Failed to start speech recognition:", err);
      setIsMicActive(false);
    }
  }, [handleQuery, isHindi, setContextualHelp, setState, setTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsMicActive(false);
    audioAnalyzer.stopSimulation();
  }, []);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopListening();
    } else {
      startListening();
    }
  }, [isMicActive, startListening, stopListening]);

  // When sheet opens: speak greeting and prime for speaking
  const openAndGreet = useCallback(() => {
    clearTimeouts();
    cancelSpeech();
    setOpen(true);
    setState("awakening");
    setTranscript("");
    setAiReplyText("");
    setProposedAction(null);
    setManualInput("");

    const greeting = isHindi
      ? "नमस्ते! मैं सहारा साथी हूँ। आप बोलिए, मैं सुन रही हूँ — जैसे लोन की स्थिति, बैलेंस, या किसी भी नंबर पर पैसे भेजना।"
      : "Namaste! Main Sahara Saathi hoon. Aap boliye, main sun rahi hoon — jaise pending loan, balance, ya payment.";

    scheduleTimeout(() => {
      setState("speaking");
      setContextualHelp(isHindi ? "साथी लाइव है" : "Saathi is live");
      audioAnalyzer.startSimulation();

      speak(greeting, isHindi ? "hi-IN" : "en-IN").finally(() => {
        audioAnalyzer.stopSimulation();
        setState("idle");
        setContextualHelp(isHindi ? "माइक दबाकर बोलें" : "Tap mic to speak");
      });
    }, 350);
  }, [clearTimeouts, isHindi, scheduleTimeout, setContextualHelp, setOpen, setState, setTranscript]);

  const close = useCallback(() => {
    clearTimeouts();
    cancelSpeech();
    stopListening();
    audioAnalyzer.stopSimulation();
    setOpen(false);
    scheduleTimeout(() => {
      setState("idle");
      setTranscript("");
      setActionIntent(null);
      setContextualHelp("");
      setAiReplyText("");
      setProposedAction(null);
      setManualInput("");
    }, 300);
  }, [
    clearTimeouts,
    scheduleTimeout,
    setActionIntent,
    setContextualHelp,
    setOpen,
    setState,
    setTranscript,
    stopListening,
  ]);

  // Dynamic quick suggestion chips
  const quickChips = isHindi
    ? [
        { label: "💳 मेरा कितना लोन पेंडिंग है?", query: "Mera loan kitna pending hai?" },
        { label: "💰 मेरा बैलेंस कितना है?", query: "Mera account balance kitna hai?" },
        { label: "📱 8318365677 पर ₹200 भेजो", query: "8318365677 par ₹200 bhejo" },
        { label: "💸 मुझे ₹500 राहुल को भेजना है", query: "Mujhe ₹500 Rahul ko bhejna hai" },
        { label: "📝 KYC कैसे करें?", query: "KYC kaise karein?" },
      ]
    : [
        { label: "💳 How much loan is pending?", query: "Mera loan kitna bacha hai?" },
        { label: "💰 Check my balance", query: "Mera balance kitna hai?" },
        { label: "📱 Send ₹200 to 8318365677", query: "8318365677 par ₹200 bhejo" },
        { label: "💸 Send ₹500 to Rahul", query: "Mujhe ₹500 Rahul ko bhejna hai" },
        { label: "🌐 Change language to Hindi", query: "Hindi mein kar do" },
      ];

  return (
    <>
      {/* Voice Floating Action Button */}
      <motion.button
        aria-label={isOpen ? "Close voice assistant" : "Open voice assistant"}
        onClick={() => (isOpen ? close() : openAndGreet())}
        className="fixed bottom-[86px] right-5 z-30 grid h-16 w-16 place-items-center rounded-[22px] bg-[#e6a62d] text-[#17324d] shadow-[0_10px_28px_rgba(136,92,18,.35)] hover:bg-[#dba02a] transition-all"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
      >
        {isOpen ? <X size={24} /> : <Mic size={26} className="animate-pulse" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[160px] right-4 z-40 w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-[26px] border border-[#e1d7c7] bg-[#fffdf8] shadow-[0_20px_60px_rgba(23,50,77,.25)]"
          >
            {/* Header */}
            <div className="bg-[#17324d] px-5 pb-4 pt-4 text-[#fffdf8]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6a62d] text-[#17324d]">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      Sahara Saathi <span className="text-xs text-[#e6a62d]">● Live Web Voice</span>
                    </div>
                    <div className="text-[11px] text-[#cbd8df]">
                      {contextualHelp || stateLabels[state] || "Ready"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={close}
                  aria-label="Close assistant"
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={17} />
                </button>
              </div>

              {/* State indicator dots */}
              <div className="mt-3 flex items-center gap-2">
                {(["awakening", "listening", "processing", "speaking", "action"] as VoiceState[]).map(
                  (step, i) => (
                    <div key={step} className="flex items-center gap-1.5">
                      <motion.div
                        className={`h-2 w-2 rounded-full ${
                          state === step
                            ? "bg-[#e6a62d]"
                            : ["awakening", "listening", "processing", "speaking", "action"].indexOf(state) > i
                            ? "bg-[#5b936d]"
                            : "bg-white/20"
                        }`}
                        animate={state === step ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{
                          repeat: state === step ? Infinity : 0,
                          duration: 1,
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 3D Voice Canvas & Interactive Speech Center */}
            <div className="relative flex flex-col items-center justify-center p-5 min-h-[200px]">
              {/* 3D Background */}
              <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
                <Suspense fallback={null}>
                  <VoiceScene />
                </Suspense>
              </div>

              {/* Main Interactive State */}
              <div className="relative z-10 w-full flex flex-col items-center text-center">
                {/* Listening / Speaking Orb Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={toggleMic}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all ${
                    state === "speaking"
                      ? "bg-gradient-to-tr from-[#3c6f53] to-[#5b936d] text-white ring-8 ring-[#5b936d]/30"
                      : isMicActive
                      ? "bg-gradient-to-tr from-[#e07a5f] to-[#f4a261] text-white ring-8 ring-[#e07a5f]/40 animate-pulse"
                      : "bg-[#17324d] text-[#e6a62d] hover:bg-[#1f3f5e] ring-4 ring-[#17324d]/20"
                  }`}
                >
                  {state === "speaking" ? (
                    <Volume2 size={36} className="animate-pulse" />
                  ) : isMicActive ? (
                    <Mic size={36} className="animate-bounce" />
                  ) : (
                    <Mic size={36} />
                  )}
                  <span className="text-[10px] font-extrabold mt-1 uppercase tracking-tight">
                    {state === "speaking"
                      ? "बोल रही है"
                      : isMicActive
                      ? "सुन रही हूँ..."
                      : "माइक दबाएँ"}
                  </span>
                </motion.button>

                <p className="mt-3 text-sm font-extrabold text-[#17324d]">
                  {state === "speaking"
                    ? isHindi
                      ? "साथी जवाब दे रही है..."
                      : "Saathi is speaking..."
                    : isMicActive
                    ? isHindi
                      ? "🟢 लाइव माइक चालू — आप बोलिए..."
                      : "🟢 Live Mic Active — Speak now..."
                    : state === "processing"
                    ? isHindi
                      ? "समझ रही हूँ..."
                      : "Understanding you..."
                    : isHindi
                    ? "बोलने के लिए ऊपर माइक दबाएँ"
                    : "Tap mic above to speak"}
                </p>

                {/* Live Transcript / AI Reply Display */}
                {transcript && (
                  <div className="mt-2.5 w-full rounded-2xl bg-[#fff9e9]/95 border border-[#e6a62d]/50 p-2.5 text-xs font-bold text-[#17324d] shadow-xs">
                    <span className="text-[#8b7c68] block text-[10px] uppercase tracking-wide">
                      {isHindi ? "आपने कहा:" : "You said:"}
                    </span>
                    "{transcript}"
                  </div>
                )}

                {aiReplyText && (
                  <div className="mt-2 w-full rounded-2xl bg-[#eef6f1] border border-[#a3cca8] p-2.5 text-xs font-semibold text-[#204933] shadow-xs text-left">
                    <span className="text-[#204933] font-bold block text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Sparkles size={11} /> {isHindi ? "साथी का जवाब:" : "Saathi's Response:"}
                    </span>
                    {aiReplyText}
                  </div>
                )}
              </div>
            </div>

            {/* Direct Input & Mic Bar */}
            <div className="px-3 pb-2 bg-[#faf6ee] flex items-center gap-1.5">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualInput.trim()) {
                    handleQuery(manualInput);
                    setManualInput("");
                  }
                }}
                placeholder={isHindi ? "टाइप करें या ऊपर माइक दबाएँ..." : "Type or tap mic..."}
                className="flex-1 h-10 px-3.5 rounded-xl border border-[#d9cfbe] bg-white text-xs font-bold text-[#17324d] outline-none focus:border-[#e6a62d] shadow-2xs"
              />
              <button
                type="button"
                disabled={!manualInput.trim()}
                onClick={() => {
                  if (manualInput.trim()) {
                    handleQuery(manualInput);
                    setManualInput("");
                  }
                }}
                className="h-10 w-10 rounded-xl bg-[#17324d] text-white disabled:opacity-40 flex items-center justify-center shrink-0 shadow-xs"
              >
                <Send size={15} />
              </button>
            </div>

            {/* Quick Action Suggestion Pills */}
            <div className="border-t border-[#eee8db] bg-[#faf6ee] p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b7c68] mb-2 px-1 flex items-center justify-between">
                <span>{isHindi ? "या फिर इनमें से चुनें:" : "Or try saying:"}</span>
                <span className="text-[10px] text-[#e07a5f]">{isHindi ? "लाइव आवाज़" : "Live AI"}</span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-[130px] overflow-y-auto pr-0.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuery(chip.query)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#e2d5c3] hover:border-[#e6a62d] text-left text-xs font-bold text-[#17324d] hover:bg-[#fff9e9] transition-all shadow-2xs active:scale-[0.98]"
                  >
                    <span>{chip.label}</span>
                    <Sparkles size={12} className="text-[#e6a62d] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
