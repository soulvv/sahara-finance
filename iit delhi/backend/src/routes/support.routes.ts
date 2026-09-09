import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createTicketHandler,
  getTicketDetailsHandler,
  getUserTicketsHandler,
} from "../controllers/support.controller";

const router = Router();

// Assistance/Ticket endpoints require active JWT authentication
router.use(authMiddleware);

router.post("/", createTicketHandler);
router.get("/:id", getTicketDetailsHandler);
router.get("/", getUserTicketsHandler);

export default router;
