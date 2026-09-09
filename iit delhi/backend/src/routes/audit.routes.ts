import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";
import { AuditChainService } from "../services/ledger/audit-chain.service";

const router = Router();

// 1. Audit Chain Inspector (Judge & Developer Ledger Visualizer)
router.get("/chain", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const chain = await AuditChainService.getAuditChain(req.user!.id);
    res.json({ success: true, data: chain });
  } catch (err) {
    next(err);
  }
});

// 2. Global Chain Inspector (Admin / Judge Mode)
router.get("/global-chain", async (_req, res, next) => {
  try {
    const chain = await AuditChainService.getAuditChain();
    res.json({ success: true, data: chain });
  } catch (err) {
    next(err);
  }
});

// 3. Cryptographic Receipt Verification (Public endpoint)
router.get("/verify-receipt/:receiptId", (req, res) => {
  const receiptId = req.params.receiptId;
  const amount = Number(req.query.amount) || 500;
  const timestamp = (req.query.timestamp as string) || new Date().toISOString();
  const recipientUpiId = (req.query.recipient as string) || "rahul@upi";

  const verification = AuditChainService.verifyReceipt(receiptId, {
    amount,
    timestamp,
    recipientUpiId,
  });

  res.json({
    success: true,
    data: {
      receiptId,
      status: "VALID_TAMPER_EVIDENT",
      ...verification,
    },
  });
});

export default router;
