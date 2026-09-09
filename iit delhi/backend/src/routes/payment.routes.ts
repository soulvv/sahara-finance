import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  initiatePaymentHandler,
  getPaymentDetailsHandler,
  executePaymentHandler,
  getReceiptHandler,
} from "../controllers/payment.controller";

const router = Router();

// Payment endpoints require active JWT authentication
router.use(authMiddleware);

router.post("/initiate", initiatePaymentHandler);
router.get("/:id", getPaymentDetailsHandler);
router.post("/execute", executePaymentHandler);
router.get("/:id/receipt", getReceiptHandler);

export default router;
