import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  lookupMerchantHandler,
  listMerchantsHandler,
} from "../controllers/merchant.controller";

const router = Router();

// Merchant lookups require active JWT authentication
router.use(authMiddleware);

router.get("/lookup", lookupMerchantHandler);
router.get("/", listMerchantsHandler);

export default router;
