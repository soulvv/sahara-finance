import mongoose from "mongoose";
import { SupportTicket, SupportTicketDocument } from "../models/SupportTicket";
import { Transaction } from "../models/Transaction";
import { TicketCategory } from "../types/support";

export interface CreateTicketParams {
  category: TicketCategory;
  transactionId?: string;
  reportedIssue: string;
  recordedViaVoice?: boolean;
}

export class SupportService {
  /**
   * Generates a collision-resistant ticket number (e.g. SAH-2026-8392).
   */
  private generateTicketNumber(): string {
    const random4 = Math.floor(1000 + Math.random() * 9000);
    return `SAH-2026-${random4}`;
  }

  /**
   * Creates a new support/grievance ticket.
   */
  async createTicket(
    userId: string,
    params: CreateTicketParams
  ): Promise<SupportTicketDocument> {
    const { category, transactionId, reportedIssue, recordedViaVoice = false } = params;

    if (!reportedIssue || reportedIssue.trim().length === 0) {
      throw {
        status: 400,
        code: "INVALID_ISSUE",
        message: "Please provide details about what happened.",
      };
    }

    // Verify linked transaction belongs to user if provided
    let linkedTransactionId: any = null;
    if (transactionId) {
      const tx = await Transaction.findOne({
        $or: [{ _id: transactionId }, { referenceId: transactionId }],
        userId,
      });

      if (!tx) {
        throw {
          status: 404,
          code: "TRANSACTION_NOT_FOUND",
          message: "The specified transaction was not found or does not belong to you.",
        };
      }
      linkedTransactionId = tx._id;
    }

    let ticketNumber = this.generateTicketNumber();
    // Ensure uniqueness
    let exists = await SupportTicket.findOne({ ticketNumber });
    while (exists) {
      ticketNumber = this.generateTicketNumber();
      exists = await SupportTicket.findOne({ ticketNumber });
    }

    const ticket = await SupportTicket.create({
      ticketNumber,
      userId,
      relatedTransactionId: linkedTransactionId,
      category: category || "FAILED_PAYMENT",
      reportedIssue: reportedIssue.trim(),
      recordedViaVoice,
      status: "IN_REVIEW",
      resolutionSlaHours: 2,
      estimatedResolutionTime: "2 hours",
    });

    return ticket;
  }

  /**
   * Retrieves ticket details by ticketNumber or _id.
   */
  async getTicket(userId: string, idOrNumber: string) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrNumber);
    const query = isObjectId
      ? { $or: [{ ticketNumber: idOrNumber }, { _id: idOrNumber }] }
      : { ticketNumber: idOrNumber };

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      throw {
        status: 404,
        code: "TICKET_NOT_FOUND",
        message: "Support ticket not found.",
      };
    }

    if (ticket.userId.toString() !== userId) {
      throw {
        status: 403,
        code: "UNAUTHORIZED",
        message: "You are not authorized to view this ticket.",
      };
    }

    return {
      ticketId: ticket.ticketNumber,
      category: ticket.category,
      reportedIssue: ticket.reportedIssue,
      recordedViaVoice: ticket.recordedViaVoice,
      status: ticket.status,
      resolutionSlaHours: ticket.resolutionSlaHours,
      estimatedResolutionTime: ticket.estimatedResolutionTime,
      createdAt: ticket.createdAt.toISOString(),
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    };
  }

  /**
   * Retrieves list of tickets for an authenticated user.
   */
  async getUserTickets(userId: string, requestedLimit?: unknown) {
    let limit = 10;
    if (requestedLimit !== undefined && requestedLimit !== null) {
      const parsed = Number(requestedLimit);
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        throw {
          status: 400,
          code: "INVALID_LIMIT",
          message: "Ticket limit must be a positive integer.",
        };
      }
      limit = Math.min(Math.max(parsed, 1), 50);
    }

    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return tickets.map((t) => ({
      ticketId: t.ticketNumber,
      category: t.category,
      reportedIssue: t.reportedIssue,
      status: t.status,
      estimatedResolutionTime: t.estimatedResolutionTime,
      createdAt: t.createdAt.toISOString(),
    }));
  }
}

export const supportService = new SupportService();
