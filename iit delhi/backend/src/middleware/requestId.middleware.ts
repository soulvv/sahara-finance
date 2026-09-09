import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface ExtendedRequest extends Request {
  id?: string;
  startTime?: number;
}

export function requestIdMiddleware(
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
): void {
  const incomingId =
    (req.headers["x-request-id"] as string) ||
    (req.headers["x-correlation-id"] as string);

  const requestId =
    incomingId && incomingId.trim().length > 0
      ? incomingId.trim()
      : `req_${crypto.randomBytes(8).toString("hex")}`;

  req.id = requestId;
  req.startTime = Date.now();
  res.setHeader("X-Request-ID", requestId);

  // Structured safe request logging upon response finish
  res.on("finish", () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";

    // Omit health check spam in development logs
    if (req.originalUrl === "/api/health" || req.originalUrl === "/api/ready") {
      return;
    }

    console.log(
      `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} -> ${statusCode} (${duration}ms) [${ip}]`
    );
  });

  next();
}
