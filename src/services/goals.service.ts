import prisma from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';

export type GoalCategory = 'EMERGENCY_FUND' | 'INVESTMENT' | 'VACATION' | 'GADGET' | 'VEHICLE' | 'PROPERTY' | 'EDUCATION' | 'WEDDING' | 'OTHER';

export interface GoalInput {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
  category: GoalCategory;
  priority?: number;
}

export interface FinancialGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string;
  priority: number;
  is_completed: boolean;
  percentage: number;
  remaining: number;
  days_left: number | null;
  monthly_needed: number | null;
}

const GOAL_ADDITION_MAX_ATTEMPTS = 3;

export class InvalidGoalAmountError extends Error {}

function isWriteConflict(error: unknown): error is { code: 'P2034' } {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2034'
  );
}

export async function createGoal(userId: bigint, input: GoalInput): Promise<FinancialGoal> {
  const goal = await prisma.financialGoal.create({
    data: {
      user_id: userId,
      name: input.name,
      target_amount: encryptNumber(input.target_amount),
      current_amount: encryptNumber(input.current_amount || 0),
      deadline: input.deadline ? new Date(input.deadline) : null,
      category: input.category,
      priority: input.priority || 2,
    },
  });

  return formatGoal(goal);
}

export async function getGoals(userId: bigint): Promise<FinancialGoal[]> {
  const goals = await prisma.financialGoal.findMany({
    where: { user_id: userId },
    orderBy: [{ is_completed: 'asc' }, { priority: 'asc' }, { deadline: 'asc' }],
  });

  return goals.map(formatGoal);
}

export async function updateGoal(userId: bigint, goalId: bigint, input: Partial<GoalInput> & { is_completed?: boolean }): Promise<FinancialGoal | null> {
  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.target_amount !== undefined) data.target_amount = encryptNumber(input.target_amount);
  if (input.current_amount !== undefined) data.current_amount = encryptNumber(input.current_amount);
  if (input.deadline !== undefined) data.deadline = input.deadline ? new Date(input.deadline) : null;
  if (input.category) data.category = input.category;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.is_completed !== undefined) data.is_completed = input.is_completed;

  const goal = await prisma.financialGoal.updateMany({
    where: { id: goalId, user_id: userId },
    data,
  });

  if (goal.count === 0) return null;

  const updated = await prisma.financialGoal.findFirst({
    where: { id: goalId, user_id: userId },
  });

  return updated ? formatGoal(updated) : null;
}

export async function addToGoal(userId: bigint, goalId: bigint, amount: number): Promise<FinancialGoal | null> {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new InvalidGoalAmountError('Goal addition must be a finite positive number');
  }

  for (let attempt = 1; attempt <= GOAL_ADDITION_MAX_ATTEMPTS; attempt += 1) {
    const goal = await prisma.financialGoal.findFirst({
      where: { id: goalId, user_id: userId },
    });

    if (!goal) return null;

    const currentAmount = decryptNumber(goal.current_amount);
    const targetAmount = decryptNumber(goal.target_amount);
    if (!Number.isFinite(currentAmount) || !Number.isFinite(targetAmount)) {
      throw new Error('Stored goal amount is invalid');
    }

    const newAmount = currentAmount + amount;
    if (!Number.isFinite(newAmount)) {
      throw new InvalidGoalAmountError('Goal addition produces an invalid balance');
    }

    const currentAmountCiphertext = encryptNumber(newAmount);
    const isCompleted = newAmount >= targetAmount;

    try {
      const updated = await prisma.financialGoal.updateMany({
        where: {
          id: goalId,
          user_id: userId,
          current_amount: goal.current_amount,
          target_amount: goal.target_amount,
          name: goal.name,
          deadline: goal.deadline,
          category: goal.category,
          priority: goal.priority,
          is_completed: goal.is_completed,
        },
        data: {
          current_amount: currentAmountCiphertext,
          is_completed: isCompleted,
        },
      });

      if (updated.count === 1) {
        return formatGoal({
          ...goal,
          current_amount: currentAmountCiphertext,
          is_completed: isCompleted,
        });
      }
    } catch (error) {
      if (!isWriteConflict(error) || attempt === GOAL_ADDITION_MAX_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error('Goal addition conflict');
}

export async function deleteGoal(userId: bigint, goalId: bigint) {
  await prisma.financialGoal.deleteMany({
    where: { id: goalId, user_id: userId },
  });
}

export async function getGoalsSummary(userId: bigint) {
  const goals = await getGoals(userId);
  const active = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);
  const totalTarget = active.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = active.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return {
    total_goals: goals.length,
    active_goals: active.length,
    completed_goals: completed.length,
    total_target: totalTarget,
    total_current: totalCurrent,
    overall_progress: overallProgress,
    nearest_deadline: active.filter(g => g.deadline).sort((a, b) => (a.days_left || 999) - (b.days_left || 999))[0] || null,
  };
}

function formatGoal(goal: {
  id: bigint;
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: Date | null;
  category: string;
  priority: number;
  is_completed: boolean;
}): FinancialGoal {
  const target = decryptNumber(goal.target_amount);
  const current = decryptNumber(goal.current_amount);
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  let daysLeft: number | null = null;
  let monthlyNeeded: number | null = null;

  if (goal.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(goal.deadline);
    deadline.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0 && remaining > 0) {
      const monthsLeft = daysLeft / 30;
      monthlyNeeded = remaining / monthsLeft;
    }
  }

  return {
    id: goal.id.toString(),
    name: goal.name,
    target_amount: target,
    current_amount: current,
    deadline: goal.deadline?.toISOString().split('T')[0] || null,
    category: goal.category,
    priority: goal.priority,
    is_completed: goal.is_completed,
    percentage,
    remaining,
    days_left: daysLeft,
    monthly_needed: monthlyNeeded,
  };
}

export const GOAL_CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: 'EMERGENCY_FUND', label: 'Dana Darurat' },
  { value: 'INVESTMENT', label: 'Investasi' },
  { value: 'VACATION', label: 'Liburan' },
  { value: 'GADGET', label: 'Gadget' },
  { value: 'VEHICLE', label: 'Kendaraan' },
  { value: 'PROPERTY', label: 'Properti' },
  { value: 'EDUCATION', label: 'Pendidikan' },
  { value: 'WEDDING', label: 'Pernikahan' },
  { value: 'OTHER', label: 'Lainnya' },
];
