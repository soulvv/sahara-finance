import { Response, NextFunction } from "express";
import { ExtendedRequest } from "./requestId.middleware";
import { env } from "../config/env";
import { sendError } from "../utils/response";

export function errorHandler(
  err: any,
  req: ExtendedRequest,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message =
    err.message || "An unexpected error occurred. Please try again later.";

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID_FORMAT";
    message = `The provided identifier for '${err.path}' is malformed or invalid.`;
  }

  // Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    const firstField = Object.keys(err.errors || {})[0];
    message = firstField
      ? err.errors[firstField].message
      : "The submitted data failed validation.";
  }

  // Handle JSON parse syntax errors from body parser
  if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    code = "INVALID_JSON_BODY";
    message = "Malformed JSON payload provided in request body.";
  }

  // Handle CORS Origin rejection
  if (err.message && err.message.includes("Not allowed by CORS")) {
    statusCode = 403;
    code = "CORS_FORBIDDEN";
    message = "Requests from this origin are not authorized.";
  }

  const requestId = req.id || "unknown";

  // Structured server-side error logging
  console.error(
    `[${new Date().toISOString()}] [${requestId}] [${code}] ${message}`,
    env.IS_PROD ? "" : err.stack || err
  );

  sendError(
    res,
    statusCode,
    code,
    message,
    {
      requestId,
      ...(env.NODE_ENV === "development" && err.stack ? { stack: err.stack } : {}),
    }
  );
}
