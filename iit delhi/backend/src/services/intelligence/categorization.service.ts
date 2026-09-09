/**
 * Transaction Categorization Service (Phase 3)
 * Auto-categorizes transactions by title/description with user correction feedback.
 */

const CATEGORY_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /food|restaurant|swiggy|zomato|dhaba|khana|snack|chai|canteen/i, category: "FOOD" },
  { pattern: /uber|ola|metro|auto|petrol|diesel|transport|bus|train|flight|travel/i, category: "TRANSPORT" },
  { pattern: /amazon|flipkart|myntra|shop|store|dukan|mall|purchase/i, category: "SHOPPING" },
  { pattern: /electric|bijli|water|gas|internet|broadband|wifi|phone|bill|dth|postpaid/i, category: "BILLS" },
  { pattern: /school|college|tuition|course|book|education|exam|fee/i, category: "EDUCATION" },
  { pattern: /hospital|doctor|pharmacy|medicine|medical|health|clinic|lab/i, category: "MEDICAL" },
  { pattern: /movie|netflix|hotstar|spotify|game|entertainment|concert/i, category: "ENTERTAINMENT" },
  { pattern: /transfer|sent|received|bhej|send|pay|upi/i, category: "TRANSFER" },
  { pattern: /loan|emi|credit|repay|installment/i, category: "LOAN" },
  { pattern: /atm|cash|withdraw/i, category: "ATM" },
  { pattern: /recharge|prepaid|topup/i, category: "RECHARGE" },
];

// User correction store (per userId per referenceId -> corrected category)
const userCorrections = new Map<string, string>();

export class CategorizationService {
  /**
   * Auto-categorize a transaction by its title and description.
   */
  public static categorize(title: string, description?: string): string {
    const text = `${title || ""} ${description || ""}`.toLowerCase();

    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(text)) {
        return rule.category;
      }
    }

    return "OTHER";
  }

  /**
   * Apply user correction for a specific transaction.
   */
  public static saveCorrection(userId: string, referenceId: string, category: string): void {
    const key = `${userId}:${referenceId}`;
    userCorrections.set(key, category);
  }

  /**
   * Get user-corrected category, or auto-categorized fallback.
   */
  public static getCategory(userId: string, referenceId: string, title: string, description?: string): string {
    const key = `${userId}:${referenceId}`;
    const correction = userCorrections.get(key);
    if (correction) return correction;
    return this.categorize(title, description);
  }
}
