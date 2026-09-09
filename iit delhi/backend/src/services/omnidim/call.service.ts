import crypto from "crypto";
import { env } from "../../config/env";
import { PhoneCallRecord } from "../../models/PhoneCallRecord";
import { User } from "../../models/User";
import { omnidimClient } from "./client";
import { sessionService } from "./session.service";
import { OutboundCallResponse } from "./types";

export class CallService {
  /**
   * Normalizes a phone number to standard E.164 format (+91XXXXXXXXXX)
   */
  private formatE164(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith("91")) return `+${cleaned}`;
    return `+${cleaned}`;
  }

  /**
   * Dispatches an outbound phone assistance call to any specified number or authenticated user.
   */
  async requestPhoneAssistance(
    userId?: string | null,
    params: {
      phoneNumber?: string;
      name?: string;
      isLoginCall?: boolean;
      reason?: string;
      context?: Record<string, any>;
    } = {}
  ): Promise<OutboundCallResponse & { loginAuthToken?: string; user?: any }> {
    let targetPhone = params.phoneNumber?.trim();
    let user = null;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!targetPhone && user?.phone) {
      targetPhone = user.phone;
    }

    if (!targetPhone) {
      throw {
        status: 400,
        code: "PHONE_NUMBER_REQUIRED",
        message: "Please enter a valid 10-digit mobile number.",
      };
    }

    const e164Phone = this.formatE164(targetPhone);
    if (!/^\+91[6-9]\d{9}$/.test(e164Phone) && !/^\+\d{10,15}$/.test(e164Phone)) {
      throw {
        status: 400,
        code: "INVALID_PHONE_NUMBER",
        message: "Please enter a valid 10-digit Indian mobile number.",
      };
    }

    const maskedPhone =
      e164Phone.slice(0, 3) + " XXXXX " + e164Phone.slice(-4);

    // If it's a login call, ensure user is created/updated and generate JWT auth token
    let loginAuthToken: string | null = null;
    if (params.isLoginCall) {
      const { signToken } = await import("../../utils/jwt");
      if (!user) {
        user = await User.findOne({ phone: e164Phone });
      }

      if (!user) {
        user = await User.create({
          phone: e164Phone,
          name: params.name?.trim() || null,
          preferredLanguage: "hinglish",
          status: "ACTIVE",
          onboardingStatus: "IN_PROGRESS",
          kycStatus: "PENDING",
        });
        console.log(`[Sahara Backend] Voice Login: New user registered ${e164Phone} (${user._id})`);
      } else if (params.name?.trim() && (!user.name || user.name.trim().length === 0)) {
        user.name = params.name.trim();
        await user.save();
      }

      loginAuthToken = signToken({
        id: user._id.toString(),
        phone: user.phone,
      });
    }

    // Check if a call was dispatched in the last 15 seconds to this phone or user
    const recentCall = await PhoneCallRecord.findOne({
      $or: [
        ...(userId ? [{ userId }] : []),
        { phoneNumberMasked: maskedPhone },
        { rawPhoneNumber: e164Phone },
      ],
      status: { $in: ["REQUESTED", "RINGING"] },
      createdAt: { $gte: new Date(Date.now() - 15 * 1000) },
    });

    if (recentCall) {
      return {
        callId: recentCall.callId,
        providerCallId: recentCall.providerCallId,
        status: recentCall.status,
        loginAuthToken: recentCall.loginAuthToken || undefined,
        message:
          `Aapki call pehle se in-progress hai (${maskedPhone}). Kripya thoda intezaar karein.`,
      };
    }

    const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const session = await sessionService.createAssistedSession(userId || (user ? user._id.toString() : null), "PHONE", {
      language: user?.preferredLanguage || "hinglish",
    });

    let providerCallId = `prov_${crypto.randomBytes(8).toString("hex")}`;
    let status: OutboundCallResponse["status"] = "REQUESTED";

    // 1. If real OmniDimension is enabled and configured, call telephony API
    if (env.OMNIDIM_MODE === "real" && omnidimClient.isConfigured()) {
      const agentIdNum = parseInt(env.OMNIDIM_AGENT_ID || "246626", 10);
      console.log(`[OmniDimension Telephony] Dispatching outbound call to ${e164Phone} via Agent ${agentIdNum}...`);

      const effectiveName = params.name?.trim() || user?.name || "Sahara Customer";
      let pendingLoanAmount = "₹5,400";
      let monthlyEmi = "₹1,800";
      let accountBalance = "₹8,420";

      if (user) {
        try {
          const { Loan } = await import("../../models/Loan");
          const { Account } = await import("../../models/Account");
          const loanDoc = await Loan.findOne({ userId: user._id });
          if (loanDoc) {
            pendingLoanAmount = `₹${loanDoc.remainingAmount.toLocaleString("en-IN")}`;
            monthlyEmi = `₹${loanDoc.monthlyEmi.toLocaleString("en-IN")}`;
          }
          const accDoc = await Account.findOne({ userId: user._id });
          if (accDoc) {
            accountBalance = `₹${accDoc.balance.toLocaleString("en-IN")}`;
          }
        } catch {
          /* non-fatal */
        }
      }

      const instructions = params.isLoginCall
        ? `User ${effectiveName} is logging into Sahara Finance via voice call. Warmly greet them by name, confirm their phone number ${e164Phone}, and welcome them to Sahara banking.`
        : `Namaste ${effectiveName} ji. User ka pending loan amount ${pendingLoanAmount} hai aur agli monthly EMI ${monthlyEmi} hai. User ka account balance ${accountBalance} hai. Agar user loan, balance, ya kisi bhi UPI ID/number par payment ke baare mein pooche, to unhe saaf aur seedhe shabdon mein exact figures batayein.`;

      const apiRes = await omnidimClient.request<{
        success: boolean;
        requestId?: number | string;
        callId?: string;
        status?: string;
        error?: string;
        error_description?: string;
      }>("/calls/dispatch", {
        method: "POST",
        body: {
          agent_id: agentIdNum,
          to_number: e164Phone,
          call_context: {
            user_name: effectiveName,
            customer_name: effectiveName,
            preferred_language: user?.preferredLanguage || "hinglish",
            assistance_reason: params.reason || (params.isLoginCall ? "VOICE_LOGIN_ASSISTANCE" : "ASSISTED_ONBOARDING"),
            session_id: session.sessionId,
            phone_number: e164Phone,
            is_login_call: params.isLoginCall ? "true" : "false",
            pending_loan_amount: pendingLoanAmount,
            monthly_emi: monthlyEmi,
            account_balance: accountBalance,
            instructions,
          },
          custom_variables: {
            user_name: effectiveName,
            preferred_language: user?.preferredLanguage || "hinglish",
            assistance_reason: params.reason || (params.isLoginCall ? "VOICE_LOGIN_ASSISTANCE" : "ASSISTED_ONBOARDING"),
            session_id: session.sessionId,
            pending_loan_amount: pendingLoanAmount,
            monthly_emi: monthlyEmi,
            account_balance: accountBalance,
          },
        },
      });

      if (!apiRes.success) {
        console.warn("[OmniDimension Telephony Warning]", apiRes.error);
        if (apiRes.error?.message?.includes("TOO MANY REQUESTS") || apiRes.error?.status === 429) {
          status = "REQUESTED";
          providerCallId = `queue_${Date.now()}`;
        } else {
          throw {
            status: 502,
            code: "OMNIDIM_CALL_DISPATCH_FAILED",
            message:
              apiRes.error?.message ||
              "OmniDimension call dispatch failed. Please verify your phone number.",
          };
        }
      }

      if (apiRes.data?.requestId || apiRes.data?.callId) {
        providerCallId = String(apiRes.data.requestId || apiRes.data.callId);
        status = "RINGING";
        console.log(`[OmniDimension Telephony] Call dispatched successfully! Provider Request ID: ${providerCallId}`);
      }
    }

    // 2. Persist Phone Call Record
    await PhoneCallRecord.create({
      callId,
      providerCallId,
      userId: userId || (user ? user._id : null),
      phoneNumberMasked: maskedPhone,
      rawPhoneNumber: e164Phone,
      reason: params.reason || (params.isLoginCall ? "VOICE_LOGIN_ASSISTANCE" : "ASSISTED_ONBOARDING"),
      isLoginCall: Boolean(params.isLoginCall),
      capturedName: params.name?.trim() || user?.name || null,
      loginAuthToken,
      callAuthStatus: params.isLoginCall ? "AUTHENTICATED" : "PENDING",
      status,
      createdAt: new Date(),
    });

    return {
      callId,
      providerCallId,
      status,
      loginAuthToken: loginAuthToken || undefined,
      message: `Saathi aapko ${maskedPhone} par call kar raha hai. Kripya phone uthayein.`,
    };
  }

  /**
   * Retrieves status of an ongoing phone assistance call.
   */
  async getCallStatus(userId: string | null | undefined, callId: string) {
    const record = await PhoneCallRecord.findOne({ callId });
    if (!record) {
      throw {
        status: 404,
        code: "CALL_NOT_FOUND",
        message: "Assistance call record not found.",
      };
    }

    if (userId && record.userId && record.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view this call.",
      };
    }

    let userObj = null;
    if (record.userId) {
      const user = await User.findById(record.userId);
      if (user) {
        userObj = {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name || record.capturedName || null,
          preferredLanguage: user.preferredLanguage,
          onboardingStatus: user.onboardingStatus,
          kycStatus: user.kycStatus,
        };
      }
    }

    return {
      callId: record.callId,
      phoneNumberMasked: record.phoneNumberMasked,
      rawPhoneNumber: record.rawPhoneNumber,
      status: record.status,
      reason: record.reason,
      isLoginCall: record.isLoginCall,
      capturedName: record.capturedName,
      loginAuthToken: record.loginAuthToken,
      callAuthStatus: record.callAuthStatus,
      user: userObj,
      durationSeconds: record.durationSeconds,
      createdAt: record.createdAt.toISOString(),
      completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    };
  }

  /**
   * Webhook handler for post-call status, outcome and support ticket creation.
   */
  async handleCallWebhook(payload: {
    callId?: string;
    providerCallId?: string;
    status: string;
    duration?: number;
    summary?: string;
    outcome?: string;
    supportNeeded?: boolean;
  }) {
    const query: any = {};
    if (payload.callId) query.callId = payload.callId;
    if (payload.providerCallId) query.providerCallId = payload.providerCallId;

    if (!query.callId && !query.providerCallId) return null;

    const record = await PhoneCallRecord.findOneAndUpdate(
      query,
      {
        $set: {
          status: payload.status,
          durationSeconds: payload.duration ?? null,
          summary: payload.summary ?? null,
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    // If user required human follow-up or was stuck on KYC, create a Support Ticket
    if (
      record &&
      record.userId &&
      (payload.supportNeeded ||
        payload.outcome === "NEEDS_HUMAN_FOLLOWUP" ||
        payload.summary?.toLowerCase().includes("human") ||
        payload.summary?.toLowerCase().includes("stuck"))
    ) {
      try {
        const { SupportTicket } = await import("../../models/SupportTicket");
        const ticketId = `SAH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        await SupportTicket.create({
          ticketId,
          userId: record.userId,
          category: "ONBOARDING_ASSISTANCE",
          priority: "HIGH",
          status: "OPEN",
          subject: "Post-Call Saathi Assistance Follow-up",
          reportedIssue:
            payload.summary ||
            `Customer requested human follow-up during phone call assistance (${record.phoneNumberMasked}).`,
          slaHours: 2,
          recordedViaVoice: true,
          createdAt: new Date(),
        });
        console.log(`[OmniDimension Webhook] Support Ticket created: ${ticketId}`);
      } catch (err) {
        console.warn("[OmniDimension Webhook] Non-fatal ticket creation error:", err);
      }
    }

    return record;
  }
}

export const callService = new CallService();
