import { Types } from "mongoose";
import sift from "sift";

/**
 * High-Performance In-Memory Document Collection
 * Provides zero-dependency local database fallback for development, CI, and live hackathon demos
 * when a local MongoDB daemon is not running.
 */
class InMemoryCollection {
  private docs: Map<string, any> = new Map();

  constructor(public readonly name: string) {}

  private createDocWrapper(raw: any): any {
    if (!raw) return null;
    const doc = { ...raw };

    if (!doc._id) {
      doc._id = new Types.ObjectId();
    }
    const idStr = doc._id.toString();

    // Define toJSON & toObject methods
    Object.defineProperty(doc, "id", {
      get() {
        return idStr;
      },
      enumerable: true,
      configurable: true,
    });

    doc.toJSON = function () {
      const copy = { ...this };
      copy.id = idStr;
      delete copy._id;
      delete copy.__v;
      return copy;
    };

    doc.toObject = function () {
      return { ...this };
    };

    const collection = this;
    doc.save = async function () {
      this.updatedAt = new Date();
      collection.docs.set(idStr, { ...this });
      return this;
    };

    return doc;
  }

  private normalizeFilter(filter: any): any {
    if (!filter || Object.keys(filter).length === 0) return {};
    const normalized: any = {};
    for (const key of Object.keys(filter)) {
      const val = filter[key];
      if (key === "_id") {
        if (typeof val === "string") {
          normalized._id = val;
        } else if (val instanceof Types.ObjectId) {
          normalized._id = val.toString();
        } else if (typeof val === "object" && val !== null) {
          normalized._id = val;
        } else {
          normalized._id = String(val);
        }
      } else if (val instanceof Types.ObjectId) {
        normalized[key] = val.toString();
      } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        normalized[key] = val;
      } else {
        normalized[key] = val;
      }
    }
    return normalized;
  }

  private matchDoc(doc: any, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    // Fast path: direct _id matching
    if (filter._id && Object.keys(filter).length === 1) {
      const targetId = filter._id instanceof Types.ObjectId ? filter._id.toString() : String(filter._id);
      const docId = doc._id instanceof Types.ObjectId ? doc._id.toString() : String(doc._id);
      return docId === targetId;
    }

    try {
      const docForSift: any = {};
      for (const k of Object.keys(doc)) {
        const v = doc[k];
        if (v instanceof Types.ObjectId) {
          docForSift[k] = v.toString();
        } else if (v instanceof Date) {
          docForSift[k] = v;
        } else {
          docForSift[k] = v;
        }
      }
      return (sift as any)(filter)(docForSift);
    } catch {
      // Fallback simple property comparison
      for (const k of Object.keys(filter)) {
        if (k.startsWith("$")) continue;
        const target = filter[k];
        const actual = doc[k];
        const targetStr = target instanceof Types.ObjectId ? target.toString() : String(target);
        const actualStr = actual instanceof Types.ObjectId ? actual.toString() : String(actual);
        if (targetStr !== actualStr) return false;
      }
      return true;
    }
  }

  find(filter: any = {}) {
    const norm = this.normalizeFilter(filter);
    const matched: any[] = [];
    for (const doc of this.docs.values()) {
      if (this.matchDoc(doc, norm)) {
        matched.push(this.createDocWrapper(doc));
      }
    }

    let sortOptions: any = null;
    let skipCount = 0;
    let limitCount: number | null = null;

    const queryBuilder = {
      sort(options: any) {
        sortOptions = options;
        return queryBuilder;
      },
      skip(count: number) {
        skipCount = count || 0;
        return queryBuilder;
      },
      limit(count: number) {
        limitCount = count;
        return queryBuilder;
      },
      lean() {
        return queryBuilder;
      },
      populate() {
        return queryBuilder;
      },
      exec: async () => {
        let results = [...matched];
        if (sortOptions) {
          const keys = Object.keys(sortOptions);
          results.sort((a, b) => {
            for (const key of keys) {
              const dir = sortOptions[key] === -1 || sortOptions[key] === "desc" ? -1 : 1;
              const valA = a[key];
              const valB = b[key];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
            }
            return 0;
          });
        }
        if (skipCount > 0) {
          results = results.slice(skipCount);
        }
        if (limitCount !== null && limitCount >= 0) {
          results = results.slice(0, limitCount);
        }
        return results;
      },
      then(resolve: any, reject: any) {
        return this.exec().then(resolve, reject);
      },
      catch(reject: any) {
        return this.exec().catch(reject);
      },
    };

    return queryBuilder;
  }

  findOne(filter: any = {}) {
    const norm = this.normalizeFilter(filter);
    let matchedDoc: any = null;
    let sortOptions: any = null;

    const findMatching = () => {
      const candidates: any[] = [];
      for (const doc of this.docs.values()) {
        if (this.matchDoc(doc, norm)) {
          candidates.push(this.createDocWrapper(doc));
        }
      }
      if (sortOptions && candidates.length > 1) {
        const keys = Object.keys(sortOptions);
        candidates.sort((a, b) => {
          for (const key of keys) {
            const dir = sortOptions[key] === -1 || sortOptions[key] === "desc" ? -1 : 1;
            const valA = a[key];
            const valB = b[key];
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
          }
          return 0;
        });
      }
      return candidates.length > 0 ? candidates[0] : null;
    };

    const queryBuilder = {
      sort(options: any) {
        sortOptions = options;
        return queryBuilder;
      },
      lean() {
        return queryBuilder;
      },
      populate() {
        return queryBuilder;
      },
      exec: async () => {
        return findMatching();
      },
      then(resolve: any, reject: any) {
        return this.exec().then(resolve, reject);
      },
      catch(reject: any) {
        return this.exec().catch(reject);
      },
    };

    return queryBuilder;
  }

  findById(id: any) {
    if (typeof id === "string" && !Types.ObjectId.isValid(id)) {
      const err: any = new Error(`Cast to ObjectId failed for value "${id}" at path "_id"`);
      err.name = "CastError";
      err.path = "_id";
      err.value = id;
      throw err;
    }
    return this.findOne({ _id: id });
  }

  async create(data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    const created: any[] = [];

    for (const item of items) {
      const _id = item._id ? (item._id instanceof Types.ObjectId ? item._id : new Types.ObjectId(item._id)) : new Types.ObjectId();
      const now = new Date();
      const doc = {
        ...item,
        _id,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
      };
      this.docs.set(_id.toString(), doc);
      created.push(this.createDocWrapper(doc));
    }

    return Array.isArray(data) ? created : created[0];
  }

  async findOneAndUpdate(filter: any, update: any, options: any = {}) {
    const norm = this.normalizeFilter(filter);
    let target = this.findOne(norm);
    let existing = await target.exec();

    if (!existing) {
      if (options && options.upsert) {
        const rawData = { ...(norm || {}) };
        if (update.$set) Object.assign(rawData, update.$set);
        if (update.$setOnInsert) Object.assign(rawData, update.$setOnInsert);
        for (const k of Object.keys(update)) {
          if (!k.startsWith("$")) rawData[k] = update[k];
        }
        return this.create(rawData);
      }
      return null;
    }

    const idStr = existing._id.toString();
    const stored = this.docs.get(idStr);

    if (update.$set) {
      Object.assign(stored, update.$set);
    }
    if (update.$inc) {
      for (const k of Object.keys(update.$inc)) {
        stored[k] = (stored[k] || 0) + update.$inc[k];
      }
    }
    if (update.$push) {
      for (const k of Object.keys(update.$push)) {
        if (!Array.isArray(stored[k])) stored[k] = [];
        stored[k].push(update.$push[k]);
      }
    }
    for (const k of Object.keys(update)) {
      if (!k.startsWith("$")) {
        stored[k] = update[k];
      }
    }

    stored.updatedAt = new Date();
    this.docs.set(idStr, stored);

    return this.createDocWrapper(stored);
  }

  async findByIdAndUpdate(id: any, update: any, options: any = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  async updateOne(filter: any, update: any, options: any = {}) {
    const res = await this.findOneAndUpdate(filter, update, options);
    return { acknowledged: true, modifiedCount: res ? 1 : 0, matchedCount: res ? 1 : 0 };
  }

  async updateMany(filter: any, update: any) {
    const norm = this.normalizeFilter(filter);
    let count = 0;
    for (const doc of this.docs.values()) {
      if (this.matchDoc(doc, norm)) {
        if (update.$set) Object.assign(doc, update.$set);
        doc.updatedAt = new Date();
        count++;
      }
    }
    return { acknowledged: true, modifiedCount: count, matchedCount: count };
  }

  async deleteMany(filter: any = {}) {
    const norm = this.normalizeFilter(filter);
    let deletedCount = 0;
    for (const [id, doc] of this.docs.entries()) {
      if (this.matchDoc(doc, norm)) {
        this.docs.delete(id);
        deletedCount++;
      }
    }
    return { acknowledged: true, deletedCount };
  }

  async deleteOne(filter: any = {}) {
    const norm = this.normalizeFilter(filter);
    for (const [id, doc] of this.docs.entries()) {
      if (this.matchDoc(doc, norm)) {
        this.docs.delete(id);
        return { acknowledged: true, deletedCount: 1 };
      }
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async countDocuments(filter: any = {}) {
    const norm = this.normalizeFilter(filter);
    let count = 0;
    for (const doc of this.docs.values()) {
      if (this.matchDoc(doc, norm)) count++;
    }
    return count;
  }

  async insertMany(docs: any[]) {
    return this.create(docs);
  }

  async exists(filter: any) {
    const doc = await this.findOne(filter).exec();
    return doc ? { _id: doc._id } : null;
  }

  async distinct(field: string, filter: any = {}) {
    const docs = await this.find(filter).exec();
    const set = new Set();
    for (const d of docs) {
      if (d[field] !== undefined) set.add(d[field]);
    }
    return Array.from(set);
  }
}

class InMemoryDatabase {
  private collections: Map<string, InMemoryCollection> = new Map();

  getCollection(name: string): InMemoryCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, new InMemoryCollection(name));
    }
    return this.collections.get(name)!;
  }

  /**
   * Patches a Mongoose model with in-memory routing fallback.
   */
  patchModel(model: any) {
    const modelName = model.modelName;
    const collection = this.getCollection(modelName);

    // Patch static methods
    model.find = (filter?: any) => collection.find(filter);
    model.findOne = (filter?: any) => collection.findOne(filter);
    model.findById = (id: any) => collection.findById(id);
    model.create = (...args: any[]) => {
      if (args.length === 1 && Array.isArray(args[0])) {
        return collection.create(args[0]);
      } else if (args.length === 1 && typeof args[0] === "object") {
        return collection.create(args[0]);
      } else {
        return collection.create(args);
      }
    };
    model.insertMany = (docs: any[]) => collection.insertMany(docs);
    model.exists = (filter: any) => collection.exists(filter);
    model.distinct = (field: string, filter?: any) => collection.distinct(field, filter);
    model.findOneAndUpdate = (filter: any, update: any, options?: any) => collection.findOneAndUpdate(filter, update, options);
    model.findByIdAndUpdate = (id: any, update: any, options?: any) => collection.findByIdAndUpdate(id, update, options);
    model.updateOne = (filter: any, update: any, options?: any) => collection.updateOne(filter, update, options);
    model.updateMany = (filter: any, update: any) => collection.updateMany(filter, update);
    model.deleteMany = (filter?: any) => collection.deleteMany(filter);
    model.deleteOne = (filter?: any) => collection.deleteOne(filter);
    model.countDocuments = (filter?: any) => collection.countDocuments(filter);
  }

  /**
   * Seeds demo data into in-memory collections so returning user and demo banking works instantly.
   */
  async seedDemoData() {
    const users = this.getCollection("User");
    const accounts = this.getCollection("Account");
    const transactions = this.getCollection("Transaction");
    const loans = this.getCollection("Loan");
    const repayments = this.getCollection("LoanRepayment");
    const onboarding = this.getCollection("OnboardingSession");
    const kyc = this.getCollection("KycRecord");
    const merchants = this.getCollection("Merchant");

    const demoPhone = "+919876543210";
    let user = await users.findOne({ phone: demoPhone });
    if (!user) {
      user = await users.create({
        phone: demoPhone,
        name: "Ravi Kumar",
        preferredLanguage: "hinglish",
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
        kycStatus: "VERIFIED",
      });
    }

    const userId = user._id;

    // Account
    let account = await accounts.findOne({ userId });
    if (!account) {
      account = await accounts.create({
        userId,
        accountNumberMasked: "XXXX XXXX 2841",
        balance: 8420.0,
        currency: "INR",
        status: "ACTIVE",
      });
    }

    // Onboarding
    let session = await onboarding.findOne({ userId });
    if (!session) {
      await onboarding.create({
        userId,
        currentStep: "COMPLETED",
        completedSteps: ["STEP_0_NAME", "STEP_1_PRIVACY", "STEP_2_DOCUMENT", "COMPLETED"],
        consentGivenAt: new Date(),
        completedAt: new Date(),
      });
    }

    // KYC
    let kycRec = await kyc.findOne({ userId });
    if (!kycRec) {
      await kyc.create({
        userId,
        documentType: "AADHAAR",
        documentNumberMasked: "XXXX-XXXX-2841",
        verifiedName: "Ravi Kumar",
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
      });
    }

    // Seed Demo Transactions
    const txCount = await transactions.countDocuments({ userId });
    if (txCount === 0) {
      const now = Date.now();
      await transactions.create([
        {
          accountId: account._id,
          userId,
          referenceId: "SAH-TXN-842910",
          type: "DEBIT",
          category: "MERCHANT_PAYMENT",
          amount: -500.0,
          title: "Rahul General Store",
          description: "Grocery purchase via QR",
          recipientName: "Rahul General Store",
          status: "SUCCESS",
          createdAt: new Date(now - 2 * 60 * 60 * 1000),
        },
        {
          accountId: account._id,
          userId,
          referenceId: "SAH-TXN-842911",
          type: "DEBIT",
          category: "RECHARGE",
          amount: -199.0,
          title: "Mobile recharge",
          description: "28-day prepaid recharge",
          status: "SUCCESS",
          createdAt: new Date(now - 24 * 60 * 60 * 1000),
        },
        {
          accountId: account._id,
          userId,
          referenceId: "SAH-TXN-842912",
          type: "CREDIT",
          category: "GOVT_BENEFIT",
          amount: 2000.0,
          title: "Government benefit",
          description: "DBT Direct Benefit Transfer",
          status: "SUCCESS",
          createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000),
        },
        {
          accountId: account._id,
          userId,
          referenceId: "SAH-TXN-842913",
          type: "DEBIT",
          category: "TRANSFER",
          amount: -1200.0,
          title: "Electricity bill",
          description: "Monthly power distribution bill",
          status: "SUCCESS",
          createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
        },
      ]);
    }

    // Seed Demo Merchants
    const merchantCount = await merchants.countDocuments();
    if (merchantCount === 0) {
      await merchants.create([
        {
          merchantId: "MERCH_RAHUL_KIRANA",
          businessName: "Rahul Kirana Store",
          category: "GROCERY",
          upiId: "rahulkirana@sahara",
          phone: "+919811223344",
          location: "Civil Lines, Delhi",
          isVerified: true,
        },
        {
          merchantId: "MERCH_SHARMA_MEDICO",
          businessName: "Sharma Medical & Pharmacy",
          category: "HEALTHCARE",
          upiId: "sharmamed@sahara",
          phone: "+919822334455",
          location: "Karol Bagh, Delhi",
          isVerified: true,
        },
        {
          merchantId: "MERCH_KISAN_SEVA",
          businessName: "Kisan Krishi Kendra",
          category: "AGRICULTURE",
          upiId: "kisankendra@sahara",
          phone: "+919833445566",
          location: "Najafgarh, Delhi",
          isVerified: true,
        },
      ]);
    }

    // Seed Demo Loan
    let loan = await loans.findOne({ userId });
    if (!loan) {
      loan = await loans.create({
        userId,
        loanType: "KCC_MICRO_LOAN",
        principalAmount: 20000.0,
        interestRateAnnual: 7.0,
        tenureMonths: 12,
        monthlyEmiAmount: 1730.0,
        paidInstallments: 5,
        totalInstallments: 12,
        outstandingPrincipal: 11840.0,
        status: "ACTIVE",
        disbursedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      });

      // Installments
      for (let i = 1; i <= 12; i++) {
        const dueDate = new Date(Date.now() + (i - 6) * 30 * 24 * 60 * 60 * 1000);
        await repayments.create({
          loanId: loan._id,
          installmentNumber: i,
          emiAmount: 1730.0,
          principalPortion: 1613.0,
          interestPortion: 117.0,
          dueDate,
          paidDate: i <= 5 ? dueDate : null,
          status: i <= 5 ? "PAID" : "UPCOMING",
          paymentReference: i <= 5 ? `SAH-EMI-REC-${1000 + i}` : null,
        });
      }
    }
  }
}

export const inMemoryDb = new InMemoryDatabase();
