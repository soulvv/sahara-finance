import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sendError } from "../utils/response";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phone: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    sendError(res, 401, "UNAUTHORIZED", "Invalid authentication token.");
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    sendError(
      res,
      401,
      "TOKEN_INVALID_OR_EXPIRED",
      "Your session has expired. Please log in again."
    );
    return;
  }

  req.user = {
    id: payload.sub,
    phone: payload.phone,
  };

  next();
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next();
  }

  const payload = verifyToken(token);
  if (payload && payload.sub) {
    req.user = {
      id: payload.sub,
      phone: payload.phone,
    };
  }

  next();
}

