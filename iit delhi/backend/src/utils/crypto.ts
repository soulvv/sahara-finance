import crypto from "crypto";
import { env } from "../config/env";

/**
 * Generates a cryptographically secure numeric OTP of specified length.
 * Uses crypto.randomInt (NOT Math.random()).
 */
export function generateSecureOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Generates a unique Request ID for OTP correlation.
 */
export function generateRequestId(): string {
  return `otp_req_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * Computes a SHA-256 HMAC hash of the OTP combined with salt/phone to prevent rainbow table attacks.
 */
export function hashOtp(phone: string, otp: string): string {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

/**
 * Constant-time comparison between submitted OTP hash and stored hash to prevent timing attacks.
 */
export function verifyOtpHash(
  phone: string,
  submittedOtp: string,
  storedHash: string
): boolean {
  const calculatedHash = hashOtp(phone, submittedOtp);
  if (calculatedHash.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}
