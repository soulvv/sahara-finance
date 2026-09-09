/**
 * Text-to-speech for the OmniDimension Sahara Saathi agent.
 * Uses high-quality Hindi/Indian neural voices with natural prosody.
 */

export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechAvailable()) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getBestSaathiVoice(lang = "hi-IN"): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Natural Hindi female/warm voices
  const hindiNatural = voices.find(
    (v) =>
      (v.lang.startsWith("hi") || v.lang === "hi-IN") &&
      (v.name.includes("Natural") ||
        v.name.includes("Google") ||
        v.name.includes("Swara") ||
        v.name.includes("Madhur") ||
        v.name.includes("Online"))
  );
  if (hindiNatural) return hindiNatural;

  // 2. Any Hindi voice
  const hindiAny = voices.find((v) => v.lang.startsWith("hi") || v.lang === "hi-IN");
  if (hindiAny) return hindiAny;

  // 3. Indian English natural voice
  const indianEng = voices.find(
    (v) =>
      v.lang.includes("IN") &&
      (v.name.includes("Natural") ||
        v.name.includes("Google") ||
        v.name.includes("Neerja") ||
        v.name.includes("Prabhat"))
  );
  if (indianEng) return indianEng;

  // 4. Any Indian English
  const indianAny = voices.find((v) => v.lang.includes("IN") || v.lang === "en-IN");
  if (indianAny) return indianAny;

  return voices[0] || null;
}

/**
 * Formats rupee amounts and numbers into natural spoken Hindi
 */
export function formatTextForSpokenVoice(text: string): string {
  return text
    .replace(/₹\s*(\d+),?(\d+)?/g, (_, p1, p2) => {
      const num = p2 ? parseInt(p1 + p2, 10) : parseInt(p1, 10);
      return `${num} रुपये`;
    })
    .replace(/●\s*Live AI/gi, "")
    .replace(/•/g, "");
}

/**
 * Speaks the given text with Saathi's warm, conversational tone.
 */
export function speak(text: string, lang = "hi-IN"): Promise<boolean> {
  if (!isSpeechAvailable() || !text) return Promise.resolve(true);

  try {
    window.speechSynthesis.cancel();

    // Resume speech synthesis if suspended by browser
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const spokenText = formatTextForSpokenVoice(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const chosenVoice = getBestSaathiVoice(lang);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };

      utterance.onend = () => finish(true);
      utterance.onerror = (e) => {
        console.warn("[Speech] Utterance error:", e);
        finish(false);
      };

      // Safety timeout: max 8s
      window.setTimeout(() => finish(true), Math.max(3500, spokenText.length * 75));

      window.speechSynthesis.speak(utterance);
    });
  } catch (err) {
    console.warn("[Speech] speak error:", err);
    return Promise.resolve(true);
  }
}

export function cancelSpeech(): void {
  if (!isSpeechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* non-fatal */
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
