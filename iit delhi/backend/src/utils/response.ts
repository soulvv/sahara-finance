import { Response } from "express";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  [key: string]: unknown;
}

export function sendSuccess<T = unknown>(
  res: Response,
  data: T,
  statusCode = 200,
  extraFields: Record<string, unknown> = {}
): Response {
  return res.status(statusCode).json({
    success: true,
    ...(typeof data === "object" && data !== null ? data : { data }),
    ...extraFields,
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  extraFields: Record<string, unknown> = {}
): Response {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...extraFields,
  });
}
