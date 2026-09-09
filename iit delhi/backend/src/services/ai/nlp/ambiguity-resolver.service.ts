/**
 * Numeric Ambiguity Protection Service
 * Detects acoustic or contextual ambiguity between orders of magnitude (e.g. ₹500 vs ₹5,000).
 */

export interface AmbiguityCheckResult {
  isAmbiguous: boolean;
  options?: number[];
  clarificationMessage?: {
    hi: string;
    hinglish: string;
    en: string;
  };
}

export class AmbiguityResolverService {
  /**
   * Check if speech transcript or text contains numeric ambiguity
   */
  public static checkAmbiguity(text: string, parsedAmount?: number): AmbiguityCheckResult {
    const lower = (text || "").toLowerCase().trim();

    // Check for acoustic blur between "paanch sau" (500) and "paanch hazaar" (5000)
    if (
      (lower.includes("paanch") || lower.includes("panch") || lower.includes("five")) &&
      !lower.includes("sau") &&
      !lower.includes("hundred") &&
      !lower.includes("hazaar") &&
      !lower.includes("thousand") &&
      parsedAmount === 5
    ) {
      return {
        isAmbiguous: true,
        options: [500, 5000],
        clarificationMessage: {
          hi: "क्या आप ₹500 भेजना चाहते हैं या ₹5,000?",
          hinglish: "Aap ₹500 keh rahe hain ya ₹5,000?",
          en: "Did you mean ₹500 or ₹5,000?",
        },
      };
    }

    // Check for "pachaas" (50) vs "paanch sau" (500)
    if (parsedAmount && (parsedAmount === 50 || parsedAmount === 500)) {
      if (lower.includes("pachas") || lower.includes("pachaas")) {
        return {
          isAmbiguous: true,
          options: [50, 500],
          clarificationMessage: {
            hi: "क्या आप ₹50 कह रहे हैं या ₹500?",
            hinglish: "Aap ₹50 keh rahe hain ya ₹500?",
            en: "Did you mean ₹50 or ₹500?",
          },
        };
      }
    }

    return { isAmbiguous: false };
  }
}
