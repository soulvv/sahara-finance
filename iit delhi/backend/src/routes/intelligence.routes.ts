import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";
import { SafeToSpendService } from "../services/intelligence/safe-to-spend.service";
import { FinancialHealthService } from "../services/intelligence/financial-health.service";
import { SpendingAnalyticsService } from "../services/intelligence/spending-analytics.service";
import { SavingsGoalService } from "../services/intelligence/savings-goal.service";
import { SimulatorService } from "../services/intelligence/simulator.service";

const router = Router();

// 1. Safe-to-Spend Computation
router.get("/safe-to-spend", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await SafeToSpendService.compute(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 2. Financial Health Score
router.get("/health-score", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await FinancialHealthService.compute(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 3. Spending Analytics
router.get("/analytics", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const result = await SpendingAnalyticsService.compute(req.user!.id, days);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 4. Savings Goals
router.get("/savings-goals", authMiddleware, (req: AuthenticatedRequest, res) => {
  const goals = SavingsGoalService.getAll(req.user!.id);
  res.json({ success: true, data: goals });
});

router.post("/savings-goals", authMiddleware, (req: AuthenticatedRequest, res) => {
  const { name, targetAmount, deadline } = req.body;
  if (!name || !targetAmount) {
    return res.status(400).json({ success: false, code: "INVALID_PARAMETERS", message: "Name and target amount are required." });
  }
  const goal = SavingsGoalService.create(req.user!.id, {
    name,
    targetAmount: Number(targetAmount),
    deadline: deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  res.status(201).json({ success: true, data: goal });
});

router.post("/savings-goals/:id/contribute", authMiddleware, (req: AuthenticatedRequest, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, code: "INVALID_AMOUNT", message: "Positive contribution amount is required." });
  }
  const updated = SavingsGoalService.addFunds(req.user!.id, req.params.id, amount);
  if (!updated) {
    return res.status(404).json({ success: false, code: "GOAL_NOT_FOUND", message: "Savings goal not found." });
  }
  res.json({ success: true, data: updated });
});

// 5. What-If Financial Simulator
router.post("/simulator", authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { type, amount, months } = req.body;
    const result = await SimulatorService.simulate(req.user!.id, {
      type: type || "BORROW",
      amount: Number(amount) || 5000,
      months: Number(months) || 6,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
