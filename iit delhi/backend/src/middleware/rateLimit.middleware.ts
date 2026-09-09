import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { env } from "../config/env";
import { sendError } from "../utils/response";

/**
 * Standard handler for 429 Too Many Requests responses.
 */
function handleRateLimitExceeded(
  _req: Request,
  res: Response,
  _next: any,
  options: any
) {
  const retryAfterSec = Math.ceil(options.windowMs / 1000);
  sendError(
    res,
    429,
    "RATE_LIMIT_EXCEEDED",
    "Too many requests. Please slow down and try again later.",
    {
      retryAfterSeconds: retryAfterSec,
      limit: options.max,
    }
  );
}

/**
 * Global API Rate Limiter
 * 300 requests per 15 minutes in production.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.IS_PROD ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitExceeded,
  skip: (req) => req.path === "/api/health" || req.path === "/api/ready",
});

/**
 * Strict Auth / OTP Rate Limiter
 * 10 OTP generation/verification attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.IS_PROD ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    sendError(
      res,
      429,
      "AUTH_RATE_LIMIT_EXCEEDED",
      `Too many authentication attempts. Please try again after ${Math.ceil(retryAfterSec / 60)} minutes.`,
      { retryAfterSeconds: retryAfterSec }
    );
  },
});

/**
 * Parameterized IP Rate Limiter helper
 */
export function ipRateLimiter(maxRequests = 50, windowMinutes = 10) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: env.IS_PROD ? maxRequests : 500,
    standardHeaders: true,
    legacyHeaders: false,
    handler: handleRateLimitExceeded,
  });
}

/**
 * Financial Mutations Rate Limiter
 * 30 payment / loan requests per 15 minutes.
 */
export const financialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.IS_PROD ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    sendError(
      res,
      429,
      "FINANCIAL_RATE_LIMIT_EXCEEDED",
      "Too many transaction attempts. Please wait a few moments before trying again.",
      { retryAfterSeconds: retryAfterSec }
    );
  },
});

/**
 * Support Ticket Rate Limiter
 * 15 tickets per 15 minutes.
 */
export const supportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.IS_PROD ? 15 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitExceeded,
});
