import { Merchant, MerchantDocument } from "../models/Merchant";

const DEFAULT_DEMO_MERCHANTS = [
  {
    name: "Rahul General Store",
    upiId: "rahul.store@upi",
    category: "Grocery",
    avatar: "🏪",
    status: "ACTIVE",
  },
  {
    name: "Neha Pharmacy",
    upiId: "neha.meds@upi",
    category: "Healthcare",
    avatar: "💊",
    status: "ACTIVE",
  },
  {
    name: "Sharma Electronics",
    upiId: "sharma.store@upi",
    category: "Electronics",
    avatar: "⚡",
    status: "ACTIVE",
  },
  {
    name: "Amit Cafe",
    upiId: "amit.cafe@upi",
    category: "Food",
    avatar: "☕",
    status: "ACTIVE",
  },
];

export class MerchantService {
  /**
   * Bootstraps default demo merchants if none exist.
   */
  async ensureDemoMerchants(): Promise<void> {
    for (const item of DEFAULT_DEMO_MERCHANTS) {
      await Merchant.findOneAndUpdate(
        { upiId: item.upiId.toLowerCase() },
        { $setOnInsert: item },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Resolves a merchant by either UPI ID or ID.
   */
  async lookupMerchant(params: {
    upiId?: string;
    id?: string;
  }): Promise<MerchantDocument> {
    await this.ensureDemoMerchants();

    let merchant: MerchantDocument | null = null;

    if (params.upiId) {
      merchant = await Merchant.findOne({
        upiId: params.upiId.trim().toLowerCase(),
        status: "ACTIVE",
      });
    } else if (params.id) {
      merchant = await Merchant.findOne({
        _id: params.id,
        status: "ACTIVE",
      });
    }

    if (!merchant && params.upiId) {
      let cleanUpi = params.upiId.trim().toLowerCase();
      if (!cleanUpi.includes("@")) {
        cleanUpi = `${cleanUpi}@upi`;
      }
      
      const rawName = cleanUpi.split("@")[0];
      const displayName = /^\d+$/.test(rawName)
        ? `Contact (${rawName})`
        : rawName
            .replace(/[._-]/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

      merchant = await Merchant.create({
        name: displayName || "UPI Recipient",
        upiId: cleanUpi,
        category: "Transfer",
        avatar: /^\d+$/.test(rawName) ? "📱" : "👤",
        status: "ACTIVE",
      });
    }

    if (!merchant) {
      throw {
        status: 404,
        code: "MERCHANT_NOT_FOUND",
        message: "Recipient could not be found.",
      };
    }

    return merchant;
  }

  /**
   * Returns list of active demo merchants.
   */
  async listDemoMerchants() {
    await this.ensureDemoMerchants();
    const merchants = await Merchant.find({ status: "ACTIVE" }).sort({
      name: 1,
    });
    return merchants.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      upiId: m.upiId,
      category: m.category,
      avatar: m.avatar,
      status: m.status,
    }));
  }
}

export const merchantService = new MerchantService();
