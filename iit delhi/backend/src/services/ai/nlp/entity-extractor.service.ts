/**
 * Vernacular Natural Language Entity Extractor
 * Normalizes Hindi, Hinglish, and English amounts, recipients, and intents.
 */

export interface ExtractedEntities {
  amount?: number;
  currency: string;
  recipient?: string;
  category?: string;
  dateRange?: { start?: string; end?: string };
  rawQuery: string;
}

export class EntityExtractorService {
  private static readonly VERNACULAR_NUMBERS: Record<string, number> = {
    // English words
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "hundred": 100, "thousand": 1000, "lakh": 100000,

    // Hindi Romanized (Hinglish)
    "ek": 1, "do": 2, "teen": 3, "chaar": 4, "paanch": 5, "panch": 5,
    "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "sau": 100, "so": 100, "hazaar": 1000, "hazar": 1000, "lakh": 100000,

    // Devanagari Hindi
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "सौ": 100, "हज़ार": 1000, "हजार": 1000, "लाख": 100000,
  };

  /**
   * Extract financial entities from spoken or typed vernacular text.
   */
  public static extract(text: string): ExtractedEntities {
    const rawQuery = text || "";
    const lower = rawQuery.toLowerCase().trim();

    const result: ExtractedEntities = {
      currency: "INR",
      rawQuery,
    };

    // 1. Check for standard numeric digits e.g. ₹500, 500, 500.50, 5,000
    const digitMatch = lower.match(/(?:₹|rs\.?|inr|rupees|rupaye)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (digitMatch && digitMatch[1]) {
      const parsed = parseFloat(digitMatch[1].replace(/,/g, ""));
      if (!isNaN(parsed) && parsed > 0) {
        result.amount = parsed;
      }
    }

    // 2. Check for spoken vernacular multipliers e.g. "paanch sau", "five hundred", "पाँच सौ", "do hazaar"
    if (!result.amount) {
      const words = lower.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w1 = words[i].replace(/[₹,]/g, "");
        const val1 = this.VERNACULAR_NUMBERS[w1];

        if (val1 !== undefined && i + 1 < words.length) {
          const w2 = words[i + 1].replace(/[₹,]/g, "");
          const val2 = this.VERNACULAR_NUMBERS[w2];

          if (val2 && (val2 === 100 || val2 === 1000 || val2 === 100000)) {
            result.amount = val1 * val2;
            break;
          }
        } else if (val1 === 100 || val1 === 1000 || val1 === 100000) {
          result.amount = val1;
          break;
        }
      }
    }

    // 3. Extract recipient name (e.g. "Rahul ko", "to Rahul", "send Rahul")
    const recipientMatch =
      lower.match(/(?:to|ko|bhejo|send|give)\s+([a-z\u0900-\u097F]+)/i) ||
      lower.match(/([a-z\u0900-\u097F]+)\s+(?:ko|bhejna|ko send)/i);

    if (recipientMatch && recipientMatch[1]) {
      const candidate = recipientMatch[1].trim();
      const stopWords = new Set(["send", "bhejo", "paise", "rupaye", "money", "ko", "transfer", "to", "mera", "account"]);
      if (!stopWords.has(candidate) && !this.VERNACULAR_NUMBERS[candidate]) {
        result.recipient = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    // 4. Extract Category if querying
    if (lower.includes("food") || lower.includes("khana") || lower.includes("restaurant")) {
      result.category = "FOOD";
    } else if (lower.includes("travel") || lower.includes("transport") || lower.includes("petrol") || lower.includes("auto")) {
      result.category = "TRANSPORT";
    } else if (lower.includes("bill") || lower.includes("bijli") || lower.includes("electricity") || lower.includes("water")) {
      result.category = "BILLS";
    } else if (lower.includes("shopping") || lower.includes("dukan") || lower.includes("store")) {
      result.category = "SHOPPING";
    }

    return result;
  }
}
