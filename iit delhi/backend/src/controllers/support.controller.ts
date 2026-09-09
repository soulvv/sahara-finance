import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { supportService } from "../services/support.service";
import { sendError, sendSuccess } from "../utils/response";

export async function createTicketHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to create a ticket.");
      return;
    }

    const { category, transactionId, reportedIssue, recordedViaVoice } = req.body;
    const ticket = await supportService.createTicket(userId, {
      category,
      transactionId,
      reportedIssue,
      recordedViaVoice,
    });

    sendSuccess(
      res,
      {
        ticket: {
          ticketId: ticket.ticketNumber,
          category: ticket.category,
          status: ticket.status,
          reportedIssue: ticket.reportedIssue,
          estimatedResolutionTime: ticket.estimatedResolutionTime,
          createdAt: ticket.createdAt.toISOString(),
        },
      },
      201
    );
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function getTicketDetailsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to view ticket.");
      return;
    }

    const { id } = req.params;
    const ticket = await supportService.getTicket(userId, id);
    sendSuccess(res, { ticket });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}

export async function getUserTicketsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to list tickets.");
      return;
    }

    const { limit } = req.query;
    const tickets = await supportService.getUserTickets(userId, limit);
    sendSuccess(res, { tickets });
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
