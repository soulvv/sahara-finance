import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import {
  createVoiceSessionHandler,
  processChatHandler,
  requestCallHandler,
  getCallStatusHandler,
  confirmActionHandler,
  callWebhookHandler,
  getOmnidimStatusHandler,
} from "../controllers/omnidim.controller";

const router = Router();

// Public status probe
router.get("/status", getOmnidimStatusHandler);

// Webhook endpoint (authenticated via provider signature where applicable)
router.post("/webhooks/call", callWebhookHandler);

// Protected OmniDimension capabilities
router.post("/session/voice", authMiddleware, createVoiceSessionHandler);
router.post("/chat", authMiddleware, processChatHandler);
router.post("/call/request", optionalAuthMiddleware, requestCallHandler);
router.get("/call/status/:callId", optionalAuthMiddleware, getCallStatusHandler);
router.post("/actions/confirm", authMiddleware, confirmActionHandler);

export default router;
