import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";
import { FraudDetectorService } from "../services/security/fraud-detector.service";
import { AnomalyDetectionService } from "../services/security/anomaly-detection.service";
import { AccountFreezeService } from "../services/security/account-freeze.service";
import { DisputeService } from "../services/security/dispute.service";
import { DeviceService } from "../services/security/device.service";

const router = Router();

// 1. Scam & Fraud Message Analyzer (public or authenticated)
router.post("/fraud-check", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, code: "INVALID_INPUT", message: "Text to analyze is required." });
  }
  const result = FraudDetectorService.analyze(text);
  res.json({ success: true, data: result });
});

// 2. Transaction Anomaly Checker
router.post("/anomaly-check", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { amount, recipientUpi } = req.body;
    const result = await AnomalyDetectionService.evaluate(req.user!.id, Number(amount) || 0, recipientUpi);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 3. Account Freeze & Status
router.get("/freeze-status", authMiddleware, (req: AuthenticatedRequest, res) => {
  const status = AccountFreezeService.getStatus(req.user!.id);
  res.json({ success: true, data: status });
});

router.post("/freeze", authMiddleware, (req: AuthenticatedRequest, res) => {
  const reason = req.body.reason || "User emergency lock";
  const result = AccountFreezeService.freeze(req.user!.id, reason);
  res.json({ success: true, data: result, message: "Account has been safely locked against outgoing payments." });
});

router.post("/unfreeze", authMiddleware, (req: AuthenticatedRequest, res) => {
  const result = AccountFreezeService.unfreeze(req.user!.id);
  res.json({ success: true, data: result, message: "Account lock has been removed." });
});

// 4. Disputes
router.get("/disputes", authMiddleware, (req: AuthenticatedRequest, res) => {
  const disputes = DisputeService.getDisputes(req.user!.id);
  res.json({ success: true, data: disputes });
});

router.post("/disputes", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { transactionId, amount, reason, details } = req.body;
  if (!transactionId || !amount || !reason) {
    return res.status(400).json({ success: false, code: "INVALID_PARAMETERS", message: "transactionId, amount, and reason are required." });
  }
  const dispute = DisputeService.create(req.user!.id, {
    transactionId,
    amount: Number(amount),
    reason,
    details,
  });
  res.status(201).json({ success: true, data: dispute });
});

// 5. Devices
router.get("/devices", authMiddleware, (req: AuthenticatedRequest, res) => {
  const sessions = DeviceService.getSessions(req.user!.id);
  res.json({ success: true, data: sessions });
});

router.post("/devices/revoke-others", authMiddleware, (req: AuthenticatedRequest, res) => {
  const result = DeviceService.revokeOtherSessions(req.user!.id);
  res.json({ success: true, data: result, message: "All other sessions have been safely terminated." });
});

export default router;
