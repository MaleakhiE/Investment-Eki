import prisma from '@/lib/prisma';
import { encrypt, decrypt, encryptNumber, decryptNumber } from '@/lib/encryption';

export interface BudgetInput {
  category: string;
  amount: number;
  period?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

export interface BudgetWithSpent {
  id: string;
  category: string;
  amount: number;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export async function createOrUpdateBudget(userId: bigint, input: BudgetInput) {
  const encryptedAmount = encryptNumber(input.amount);
  
  const budget = await prisma.budget.upsert({
    where: { user_id_category: { user_id: userId, category: input.category } },
    update: { amount: encryptedAmount, period: input.period || 'MONTHLY' },
    create: {
      user_id: userId,
      category: input.category,
      amount: encryptedAmount,
      period: input.period || 'MONTHLY',
    },
  });

  return {
    id: budget.id.toString(),
    category: budget.category,
    amount: input.amount,
    period: budget.period,
  };
}

export async function getBudgets(userId: bigint): Promise<BudgetWithSpent[]> {
  const budgets = await prisma.budget.findMany({
    where: { user_id: userId },
    orderBy: { category: 'asc' },
  });

  // Get current period spending
  const now = new Date();
  const results: BudgetWithSpent[] = [];

  for (const budget of budgets) {
    const amount = decryptNumber(budget.amount);
    let startDate: Date;
    let endDate: Date;

    if (budget.period === 'WEEKLY') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (budget.period === 'YEARLY') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      // MONTHLY (default)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: 'EXPENSE',
        category: budget.category,
        date: { gte: startDate, lte: endDate },
      },
    });

    const spent = transactions.reduce((sum, tx) => sum + decryptNumber(tx.amount), 0);
    const remaining = Math.max(0, amount - spent);
    const percentage = amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;

    results.push({
      id: budget.id.toString(),
      category: budget.category,
      amount,
      period: budget.period,
      spent,
      remaining,
      percentage,
      isOverBudget: spent > amount,
    });
  }

  return results;
}

export async function deleteBudget(userId: bigint, budgetId: bigint) {
  await prisma.budget.deleteMany({
    where: { id: budgetId, user_id: userId },
  });
}

export async function getBudgetAlerts(userId: bigint): Promise<BudgetWithSpent[]> {
  const budgets = await getBudgets(userId);
  // Return budgets that are over 80% spent or over budget
  return budgets.filter(b => b.percentage >= 80);
}
