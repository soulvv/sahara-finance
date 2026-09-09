import { create } from "zustand";
import { Lang, copy } from "../lib/i18n";

/**
 * Language is global state (Zustand) so that switching the language on one
 * screen instantly re-renders every screen using `useLang()`.
 * Previously this was per-hook local state, which meant other screens
 * never picked up the change until a full remount.
 */

const LANG_KEY = "sahara-lang";

// BCP 47 tags so assistive tech (screen readers) pronounce content correctly
const BCP47: Record<Lang, string> = {
  hi: "hi-IN",
  en: "en-IN",
  hinglish: "hi-IN",
};

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored && stored in copy) return stored;
  } catch {
    /* storage unavailable — fall through to default */
  }
  return "hinglish";
}

function syncDocumentLang(lang: Lang) {
  document.documentElement.lang = BCP47[lang];
}

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangStore>(set => ({
  lang: initialLang(),
  setLang: lang => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* non-fatal */
    }
    syncDocumentLang(lang);
    set({ lang });
  },
}));

// Keep <html lang> correct from the very first import
syncDocumentLang(useLangStore.getState().lang);

export function useLang() {
  const lang = useLangStore(s => s.lang);
  const setLang = useLangStore(s => s.setLang);
  return { lang, setLang, t: copy[lang] };
}
