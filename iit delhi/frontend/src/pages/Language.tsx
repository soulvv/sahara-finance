import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, ChevronRight, Globe2 } from "lucide-react";
import { Top } from "../components/layout/Top";
import { Lang } from "../lib/i18n";
import { useLang } from "../hooks/useLang";
import { PageTransition } from "../motion/pageTransitions";

export default function Language() {
  const [, nav] = useLocation();
  const { lang, setLang } = useLang();
  // Preselect the currently active language
  const [choice, setChoice] = useState<Lang>(lang);

  const options = [
    ["hi", "हिन्दी (Hindi)", "शुद्ध एवं सरल हिन्दी", "सभी मेनू, संदेश और बोलचाल हिन्दी में"],
    ["hinglish", "Hinglish", "Hindi + English", "Daily bolchal ki aasan bhasha"],
    ["en", "English", "Simple English", "Clear everyday financial terms"],
  ] as const;

  const isHindi = choice === "hi";

  return (
    <PageTransition className="sahara-grain flex flex-1 flex-col h-full bg-[#f8f4eb]">
      <Top
        back
        title={isHindi ? "अपनी भाषा चुनें" : "Choose your language"}
        onBack={() => nav("/")}
      />
      <div className="content-scroll flex flex-col pb-6">
        <span className="signal-notch" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-[-.04em] text-[#17324d]">
          {isHindi
            ? "आप किस भाषा में बात करना चाहेंगे?"
            : "Which language do you prefer to speak?"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#66717b]">
          {isHindi
            ? "वह भाषा चुनें जिसमें आप ऐप का उपयोग और बोलकर बात करना चाहते हैं।"
            : "Select the language you are most comfortable speaking and reading."}
        </p>

        <div className="mt-7 space-y-3">
          {options.map(([id, title, sub, desc]) => (
            <button
              key={id}
              onClick={() => {
                setChoice(id);
                setLang(id);
              }}
              className={`flex min-h-[82px] w-full items-center justify-between rounded-2xl border-2 px-5 py-3 text-left transition-all ${
                choice === id
                  ? "border-[#e6a62d] bg-[#fff9e9] shadow-sm scale-[0.99]"
                  : "border-[#e4dccd] bg-[#fffdf8] hover:border-[#ded5c5]"
              }`}
            >
              <div>
                <div className="text-lg font-extrabold text-[#17324d]">
                  {title}
                </div>
                <div className="text-xs font-semibold text-[#b37b12]">
                  {sub}
                </div>
                <div className="text-xs text-[#8b7c68] mt-0.5">{desc}</div>
              </div>
              {choice === id ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e6a62d] text-[#17324d] shrink-0">
                  <Check size={18} strokeWidth={3} />
                </span>
              ) : (
                <ChevronRight className="text-[#b3aa9c] shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <button
            className="primary-button w-full flex items-center justify-center gap-2 font-bold shadow-md active:scale-[0.98] transition-transform"
            onClick={() => {
              setLang(choice);
              nav("/login");
            }}
          >
            {isHindi ? "आगे बढ़ें" : "Continue"} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
