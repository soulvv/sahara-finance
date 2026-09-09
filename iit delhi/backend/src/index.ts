import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase, isUsingInMemoryDatabase } from "./config/database";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import {
  globalRateLimiter,
  authRateLimiter,
  financialRateLimiter,
  supportRateLimiter,
} from "./middleware/rateLimit.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import kycRoutes from "./routes/kyc.routes";
import accountRoutes from "./routes/account.routes";
import transactionRoutes from "./routes/transaction.routes";
import merchantRoutes from "./routes/merchant.routes";
import paymentRoutes from "./routes/payment.routes";
import loanRoutes from "./routes/loan.routes";
import supportRoutes from "./routes/support.routes";
import omnidimRoutes from "./routes/omnidim.routes";
import intelligenceRoutes from "./routes/intelligence.routes";
import securityRoutes from "./routes/security.routes";
import aiRoutes from "./routes/ai.routes";
import auditRoutes from "./routes/audit.routes";
import { errorHandler } from "./middleware/error.middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust reverse proxies (Render, Cloudflare, Vercel, Railway, Nginx)
  app.set("trust proxy", 1);

  // 1. Connect to MongoDB
  try {
    await connectDatabase();
  } catch (error) {
    console.error("[Sahara Backend] Fatal database connection error. Exiting.", error);
    process.exit(1);
  }

  // 2. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed in frontend PWA or Cloudflare headers to allow WebGL & Three.js shaders
      crossOriginEmbedderPolicy: false,
    })
  );

  // 3. Request Correlation ID & Safe Structured Logging
  app.use(requestIdMiddleware);

  // 4. CORS Configuration
  const allowedOrigins = [
    ...env.ALLOWED_ORIGINS,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some((allowed) => {
          if (allowed === "*") return true;
          return origin === allowed || origin.endsWith(".pages.dev") || origin.endsWith(".vercel.app");
        });

        if (isAllowed || !env.IS_PROD) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    })
  );

  // 5. Body Parsing with Strict 1MB limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // 6. Global API Rate Limiter
  app.use("/api/", globalRateLimiter);

  // 7. Health and Readiness Diagnostics
  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      service: "sahara-finance-backend",
      status: "healthy",
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      otpMode: env.OTP_MODE,
      disclaimer: "Sahara Finance prototype - financial operations are simulated in a demo sandbox.",
    });
  });

  app.get("/api/ready", (_req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1 || isUsingInMemoryDatabase();
    if (isDbConnected) {
      res.json({
        success: true,
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        database: "disconnected",
      });
    }
  });

  // 8. Register API Routers with Differentiated Rate Limits
  app.use("/api/auth", authRateLimiter, authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/kyc", kycRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/merchants", merchantRoutes);
  app.use("/api/payments", financialRateLimiter, paymentRoutes);
  app.use("/api/loans", financialRateLimiter, loanRoutes);
  app.use("/api/assistance/tickets", supportRateLimiter, supportRoutes);
  app.use("/api/omnidim", omnidimRoutes);
  app.use("/api/intelligence", intelligenceRoutes);
  app.use("/api/security", securityRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/audit", auditRoutes);

  // 9. Centralized Error Handling for API routes
  app.use(errorHandler);

  // 10. Serve static files in production if frontend is co-hosted
  const staticPath =
    env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(staticPath, "index.html"), (err) => {
      if (err) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Resource not found.",
        });
      }
    });
  });

  // 11. Start HTTP Server (binds to 0.0.0.0 in cloud container environments)
  const port = env.PORT;
  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`[Sahara Backend] API running on http://${host}:${port}/ (NODE_ENV: ${env.NODE_ENV})`);
    console.log(`[Sahara Backend] OTP Mode: ${env.OTP_MODE.toUpperCase()} (Demo: ${env.OTP_DEV_MODE})`);
  });

  // 12. Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    console.log(`\n[Sahara Backend] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("[Sahara Backend] Fatal startup failure:", err);
  process.exit(1);
});
