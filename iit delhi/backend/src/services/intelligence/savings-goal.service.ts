/**
 * Savings Goals Service (Phase 3)
 * Allows creation and tracking of savings goals with weekly/monthly targets.
 */

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO date
  createdAt: string;
}

// In-memory savings goal store
const goalsStore = new Map<string, SavingsGoal[]>();
let goalCounter = 1;

export class SavingsGoalService {
  public static create(userId: string, params: { name: string; targetAmount: number; deadline: string }): SavingsGoal {
    const goals = goalsStore.get(userId) || [];
    const goal: SavingsGoal = {
      id: `goal_${goalCounter++}`,
      userId,
      name: params.name,
      targetAmount: params.targetAmount,
      currentAmount: 0,
      deadline: params.deadline,
      createdAt: new Date().toISOString(),
    };
    goals.push(goal);
    goalsStore.set(userId, goals);
    return goal;
  }

  public static getAll(userId: string): (SavingsGoal & { remainingAmount: number; progressPercent: number; monthlyRequired: number; weeklyRequired: number })[] {
    const goals = goalsStore.get(userId) || [];
    return goals.map((g) => {
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const progressPercent = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;

      const deadlineDate = new Date(g.deadline);
      const now = new Date();
      const monthsLeft = Math.max(1, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()));
      const weeksLeft = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));

      return {
        ...g,
        remainingAmount: remaining,
        progressPercent,
        monthlyRequired: Math.ceil(remaining / monthsLeft),
        weeklyRequired: Math.ceil(remaining / weeksLeft),
      };
    });
  }

  public static addFunds(userId: string, goalId: string, amount: number): SavingsGoal | null {
    const goals = goalsStore.get(userId) || [];
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return null;
    goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
    return goal;
  }
}
