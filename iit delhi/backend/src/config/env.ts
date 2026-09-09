import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root if present
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

// Warn if using default dev JWT secret in production
const jwtSecret =
  process.env.JWT_SECRET || "sahara_jwt_secret_dev_key_change_in_production";
if (isProd && jwtSecret === "sahara_jwt_secret_dev_key_change_in_production") {
  console.warn(
    "[SECURITY WARNING] You are running in production with the default JWT_SECRET! Set a secure, random JWT_SECRET in your environment variables."
  );
}

// Support comma-separated origins in CLIENT_ORIGIN
const rawOrigins = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const clientOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV,
  IS_PROD: isProd,
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sahara_finance",
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  OTP_MODE: (process.env.OTP_MODE || "demo") as "demo" | "sms",
  OTP_DEV_MODE: process.env.OTP_DEV_MODE !== "false" && process.env.OTP_MODE !== "sms",
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || "6", 10),
  OTP_EXPIRY_SECONDS: parseInt(process.env.OTP_EXPIRY_SECONDS || "300", 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || "30",
    10
  ),
  OTP_MAX_REQUESTS_PER_WINDOW: parseInt(
    process.env.OTP_MAX_REQUESTS_PER_WINDOW || "5",
    10
  ),
  OTP_RATE_LIMIT_WINDOW_MINUTES: parseInt(
    process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || "15",
    10
  ),
  CLIENT_ORIGIN: rawOrigins,
  ALLOWED_ORIGINS: clientOrigins,
  OMNIDIM_MODE: (process.env.OMNIDIM_MODE || "mock") as "mock" | "real",
  OMNIDIM_API_KEY: process.env.OMNIDIM_API_KEY || "",
  OMNIDIM_AGENT_ID: process.env.OMNIDIM_AGENT_ID || "246626",
  OMNIDIM_BASE_URL: process.env.OMNIDIM_BASE_URL || "",
} as const;
