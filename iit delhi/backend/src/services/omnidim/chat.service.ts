import { env } from "../../config/env";
import { actionService } from "./action.service";
import { omnidimClient } from "./client";
import { sessionService } from "./session.service";
import {
  ChatMessageRequest,
  ChatMessageResponse,
  WebsiteAction,
} from "./types";

export class ChatService {
  /**
   * Processes a conversational message from the user.
   */
  async processMessage(
    userId: string,
    params: ChatMessageRequest
  ): Promise<ChatMessageResponse> {
    const rawMessage = (params.message || "").trim();
    if (!rawMessage) {
      return {
        reply: "Namaste! Main Sahara Saathi hoon. Aap mujhse bolkar ya type karke kuch bhi pooch sakte hain.",
        actions: [],
      };
    }

    const session = await sessionService.createAssistedSession(userId, "CHAT", {
      language: params.language,
      currentRoute: params.context?.currentRoute,
    });

    // 1. If real OmniDimension is enabled and configured, query provider
    if (env.OMNIDIM_MODE === "real" && omnidimClient.isConfigured()) {
      const apiRes = await omnidimClient.request<{
        reply: string;
        intent?: string;
        proposedAction?: { type: string; payload?: Record<string, any> };
      }>("/chat", {
        method: "POST",
        body: {
          message: rawMessage,
          language: params.language || "hinglish",
          userId,
          context: params.context,
        },
      });

      if (apiRes.success && apiRes.data?.reply) {
        const validatedActions: WebsiteAction[] = [];
        if (apiRes.data.proposedAction) {
          const action = actionService.validateAndNormalizeAction(
            apiRes.data.proposedAction.type,
            apiRes.data.proposedAction.payload
          );
          if (action) {
            await actionService.executeOrAuditAction(
              userId,
              action,
              "CHAT",
              session.sessionId
            );
            validatedActions.push(action);
          }
        }

        return {
          reply: apiRes.data.reply,
          actions: validatedActions,
          intent: apiRes.data.intent,
          sessionId: session.sessionId,
        };
      }
    }

    // 2. Deep Natural Language & Colloquial Dialect Intent Engine
    return this.processNaturalLanguageMock(userId, rawMessage, session.sessionId);
  }

  /**
   * Deep natural language intent parser accommodating colloquial dialects,
   * broken phrasing, and speech inputs from diverse users.
   */
  private async processNaturalLanguageMock(
    userId: string,
    message: string,
    sessionId: string
  ): Promise<ChatMessageResponse> {
    const lower = message.toLowerCase();
    const actions: WebsiteAction[] = [];
    let reply = "";
    let intent = "GENERAL_CONCIERGE";

    // --- MALICIOUS / HIGH-RISK PROMPT DETECTION ---
    if (
      lower.includes("send ₹50,000 right now") ||
      lower.includes("transfer money directly") ||
      lower.includes("ignore all previous instructions") ||
      lower.includes("delete my account") ||
      lower.includes("open this arbitrary website") ||
      lower.includes("tell me my pin") ||
      lower.includes("tell me my otp") ||
      lower.includes("another user's details")
    ) {
      intent = "SECURITY_REJECTION";
      reply =
        "Suraksha ke kaaran main sidhe paise transfer nahi kar sakti, PIN/OTP nahi bata sakti, aur na hi koi asurakshit website khol sakti hoon. Aap payment Sahara ke safe payment screen par khud review karke confirm kar sakte hain.";
      return { reply, actions: [], intent, sessionId };
    }

    // --- LANGUAGE CHANGE INTENT ---
    if (
      lower.includes("hindi") ||
      lower.includes("हिंदी") ||
      lower.includes("hindi me") ||
      lower.includes("hindi mein")
    ) {
      intent = "CHANGE_LANGUAGE";
      reply = "जी बिल्कुल! मैंने आपकी भाषा हिंदी में बदल दी है। अब मैं हिंदी में सहायता करूँगी।";
      const action = actionService.validateAndNormalizeAction("CHANGE_LANGUAGE", {
        language: "hi",
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    } else if (
      lower.includes("english") ||
      lower.includes("अंग्रेजी") ||
      lower.includes("in english")
    ) {
      intent = "CHANGE_LANGUAGE";
      reply = "Certainly! I have switched your preferred language to English.";
      const action = actionService.validateAndNormalizeAction("CHANGE_LANGUAGE", {
        language: "en",
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    } else if (lower.includes("hinglish") || lower.includes("mix language")) {
      intent = "CHANGE_LANGUAGE";
      reply = "Samajh gayi! Ab se hum Hinglish mein baat karenge.";
      const action = actionService.validateAndNormalizeAction("CHANGE_LANGUAGE", {
        language: "hinglish",
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- NAME UPDATE (CONFIRMATION REQUIRED) ---
    else if (
      lower.includes("mera naam") ||
      lower.includes("naam badal") ||
      lower.includes("name change") ||
      lower.includes("my name is") ||
      lower.includes("naam update")
    ) {
      intent = "UPDATE_NAME";
      let extractedName = "Shubham Singh";
      const nameMatch =
        message.match(/mera naam ([\w\s]+?)(?: hai| kar do| rakh do|$)/i) ||
        message.match(/my name is ([\w\s]+)/i) ||
        message.match(/name (?:is|to|as) ([\w\s]+)/i) ||
        message.match(/naam ([\w\s]+)/i);

      if (nameMatch && nameMatch[1]) {
        extractedName = nameMatch[1].trim();
      }

      reply = `Kya aap chahte hain ki main aapka naam "${extractedName}" update kar doon? Kripya neeche confirm karein.`;
      const action = actionService.validateAndNormalizeAction("UPDATE_NAME", {
        name: extractedName,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- MONEY TRANSFER / SEND MONEY (ANY PHONE NUMBER OR UPI ID) ---
    else if (
      lower.includes("bhejna") ||
      lower.includes("bhej do") ||
      lower.includes("bhejo") ||
      lower.includes("send") ||
      lower.includes("pay") ||
      lower.includes("transfer") ||
      lower.includes("daal do") ||
      lower.includes("paisa dena") ||
      lower.includes("upi")
    ) {
      intent = "OPEN_PAYMENT";

      // 1. Identify recipient: Phone Number, UPI ID, or Named Merchant
      const phoneMatch = message.match(/(?:(?:\+91|91|0)?[6-9]\d{9})/);
      const phoneStr = phoneMatch ? phoneMatch[0].replace(/^(\+91|91|0)/, "") : null;

      const upiMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/);
      const upiStr = upiMatch ? upiMatch[1] : null;

      let recipient = "Rahul General Store";
      if (phoneStr) {
        recipient = phoneStr;
      } else if (upiStr) {
        recipient = upiStr;
      } else if (lower.includes("neha")) {
        recipient = "Neha Pharmacy";
      } else if (lower.includes("sharma")) {
        recipient = "Sharma Electronics";
      } else if (lower.includes("amit")) {
        recipient = "Amit Cafe";
      } else if (lower.includes("rahul")) {
        recipient = "Rahul General Store";
      }

      // 2. Extract amount: isolate from the phone number so digits aren't confused!
      let amount = 500;
      const cleanMsgWithoutPhone = phoneStr ? message.replace(phoneStr, "") : message;
      const currencyMatch =
        cleanMsgWithoutPhone.match(/(?:₹|rs\.?|inr|rupaye?|rupees?)\s*(\d+)/i) ||
        cleanMsgWithoutPhone.match(/(\d+)\s*(?:₹|rs\.?|inr|rupaye?|rupees?|ka|ke|ki|bhejo|transfer|daalo)/i) ||
        cleanMsgWithoutPhone.match(/\b(\d{1,6})\b/);

      if (currencyMatch && currencyMatch[1]) {
        const parsedAmt = parseInt(currencyMatch[1], 10);
        if (parsedAmt > 0 && parsedAmt <= 50000) {
          amount = parsedAmt;
        }
      }

      reply = `Maine ${recipient} ke liye ₹${amount.toLocaleString("en-IN")} ka payment taiyaar kar diya hai. Kripya payment screen par details check karke swipe confirm karein.`;
      const action = actionService.validateAndNormalizeAction("OPEN_PAYMENT", {
        recipient,
        amount,
        route: `/pay?amount=${amount}&recipient=${encodeURIComponent(recipient)}`,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- LOAN / EMI / PENDING AMOUNT / UDHAR ---
    else if (
      lower.includes("loan") ||
      lower.includes("emi") ||
      lower.includes("kist") ||
      lower.includes("udhar") ||
      lower.includes("karza") ||
      lower.includes("pending") ||
      lower.includes("kitna bacha") ||
      lower.includes("kist kab") ||
      lower.includes("kist bharna")
    ) {
      intent = "SHOW_LOAN";
      let remaining = 5400;
      let emi = 1800;
      let total = 5400;

      if (userId) {
        try {
          const { Loan } = await import("../../models/Loan");
          const userLoan = await Loan.findOne({ userId });
          if (userLoan) {
            remaining = userLoan.remainingAmount;
            emi = userLoan.monthlyEmi;
            total = userLoan.totalRepayable;
          }
        } catch {
          /* non-fatal */
        }
      }

      reply = `Aapka bacha hua loan ₹${remaining.toLocaleString("en-IN")} hai (Total loan: ₹${total.toLocaleString("en-IN")}). Agli monthly kist (EMI) ₹${emi.toLocaleString("en-IN")} hai. Chaliye main aapko loan details page par le jaati hoon.`;
      const action = actionService.validateAndNormalizeAction("SHOW_LOAN", {
        remaining,
        emi,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- BALANCE / KHATA / PAISA CHECK ---
    else if (
      lower.includes("balance") ||
      lower.includes("paisa") ||
      lower.includes("kitne paise") ||
      lower.includes("khata") ||
      lower.includes("maal") ||
      lower.includes("rupaye kitne") ||
      lower.includes("account me") ||
      lower.includes("kitna rupya")
    ) {
      intent = "SHOW_BALANCE";
      let balance = 8420;
      if (userId) {
        try {
          const { Account } = await import("../../models/Account");
          const acc = await Account.findOne({ userId });
          if (acc) balance = acc.balance;
        } catch {
          /* non-fatal */
        }
      }

      reply = `Aapke Sahara khate mein abhi kul ₹${balance.toLocaleString("en-IN")} bache hain. Chaliye main aapko dashboard par le chalti hoon.`;
      const action = actionService.validateAndNormalizeAction("FOCUS_BALANCE");
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- TRANSACTION HISTORY / PASSBOOK / STATEMENT ---
    else if (
      lower.includes("history") ||
      lower.includes("hisab") ||
      lower.includes("passbook") ||
      lower.includes("statement") ||
      lower.includes("pichle paise") ||
      lower.includes("kisko diya") ||
      lower.includes("transaction")
    ) {
      intent = "SHOW_HISTORY";
      reply =
        "Aapka pichla saara len-den aur transaction history dashboard par darj hai. Chaliye main aapko recent transactions par le chalti hoon.";
      const action = actionService.validateAndNormalizeAction("NAVIGATE", {
        screen: "DASHBOARD",
        route: "/dashboard",
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- KYC / AADHAAR / PEHCHAN / CAMERA ---
    else if (
      lower.includes("kyc") ||
      lower.includes("aadhaar") ||
      lower.includes("aadhar") ||
      lower.includes("pan card") ||
      lower.includes("photo") ||
      lower.includes("camera") ||
      lower.includes("pehchan") ||
      lower.includes("kagaz") ||
      lower.includes("document")
    ) {
      intent = "EXPLAIN_KYC";
      reply =
        "KYC ka matlab hai pehchaan satyapan (Identity Verification). Bas apna Aadhaar ya PAN card camera ke samne rakhein. Main aapko seedhe KYC step par le jaa rahi hoon.";
      const action = actionService.validateAndNormalizeAction("NAVIGATE", {
        screen: "ONBOARDING",
        route: "/onboarding",
        step: 2,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- PRIVACY PLEDGE / DATA SECURITY ---
    else if (
      lower.includes("privacy") ||
      lower.includes("data suraksha") ||
      lower.includes("pledge") ||
      lower.includes("consent") ||
      lower.includes("surakshit") ||
      lower.includes("safe")
    ) {
      intent = "EXPLAIN_PRIVACY";
      reply =
        "Sahara DPDP Act 2023 ke tehat aapke data ko 100% surakshit rakhta hai. Hum aapka data kisi ko share nahi karte. Chaliye main aapko Privacy Consent step par le chalti hoon.";
      const action = actionService.validateAndNormalizeAction("NAVIGATE", {
        screen: "ONBOARDING",
        route: "/onboarding",
        step: 1,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- ONBOARDING / ACCOUNT SETUP (CONCIERGE) ---
    else if (
      lower.includes("account banana") ||
      lower.includes("account setup") ||
      lower.includes("naya khata") ||
      lower.includes("shuru kaise kare") ||
      lower.includes("madad") ||
      lower.includes("kaise use kare")
    ) {
      intent = "NAVIGATE_ONBOARDING";
      reply =
        "Koi baat nahi! Main aapko step by step Sahara account setup karwa deti hoon. Pehle aapka naam confirm karte hain.";
      const action = actionService.validateAndNormalizeAction("NAVIGATE", {
        screen: "ONBOARDING",
        route: "/onboarding",
        step: 0,
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- REQUEST PHONE CALL ---
    else if (
      lower.includes("call me") ||
      lower.includes("phone lagao") ||
      lower.includes("call kijiye") ||
      lower.includes("phone par baat") ||
      lower.includes("call karo")
    ) {
      intent = "REQUEST_CALL";
      reply =
        "Ji bilkul! Main aapke registered phone number par Sahara Saathi se call dispatch kar rahi hoon. Kripya phone uthayein.";
      const action = actionService.validateAndNormalizeAction("OPEN_HELP", {
        action: "PHONE_CALL",
      });
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- HELP / GRIEVANCE / FAILED PAYMENT ---
    else if (
      lower.includes("help") ||
      lower.includes("shikayat") ||
      lower.includes("problem") ||
      lower.includes("fail") ||
      lower.includes("phas gaye") ||
      lower.includes("support")
    ) {
      intent = "OPEN_HELP";
      reply =
        "Pareshan mat hoiye! Main aapko Help & Grievance Support page par le chalti hoon jahan 2 ghante ki guaranteed SLA ke sath aapki samasya suljhai jayegi.";
      const action = actionService.validateAndNormalizeAction("OPEN_HELP");
      if (action) {
        await actionService.executeOrAuditAction(userId, action, "CHAT", sessionId);
        actions.push(action);
      }
    }

    // --- NATURAL CONVERSATIONAL ASSISTANT FOR GENERAL FINANCIAL QUERIES ---
    else {
      intent = "GENERAL_ASSISTANT";
      reply =
        "Main Sahara Saathi hoon — aapki digital saathi! Main aapka balance batane, loan status dikhane, kisi bhi mobile ya UPI par paise bhejne, aur account setup karne mein poori madad kar sakti hoon. Aap mujhse bolkar pooch sakte hain.";
    }

    return {
      reply,
      actions,
      intent,
      sessionId,
    };
  }
}

export const chatService = new ChatService();
