import { Router } from "express";
import {
  sendOtpHandler,
  verifyOtpHandler,
  completeCallLoginHandler,
  logoutHandler,
} from "../controllers/auth.controller";
import { ipRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// Public OTP and Call Login endpoints with IP-level rate protection
router.post("/send-otp", ipRateLimiter(10, 10), sendOtpHandler);
router.post("/verify-otp", ipRateLimiter(20, 10), verifyOtpHandler);
router.post("/call-login-complete", ipRateLimiter(20, 10), completeCallLoginHandler);
router.post("/logout", logoutHandler);

export default router;
