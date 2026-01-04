import prisma from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';

export interface RecurringInput {
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

export async function createRecurring(userId: bigint, input: RecurringInput) {
  const recurring = await prisma.recurringTransaction.create({
    data: {
      user_id: userId,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: encryptNumber(input.amount),
      frequency: input.frequency,
      day_of_month: input.day_of_month,
      day_of_week: input.day_of_week,
      start_date: new Date(input.start_date),
      end_date: input.end_date ? new Date(input.end_date) : null,
    },
  });

  return formatRecurring(recurring);
}

export async function getRecurrings(userId: bigint): Promise<RecurringTransaction[]> {
  const recurrings = await prisma.recurringTransaction.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  return recurrings.map(formatRecurring);
}

export async function updateRecurring(userId: bigint, id: bigint, input: Partial<RecurringInput> & { is_active?: boolean }) {
  const data: Record<string, unknown> = {};
  if (input.type) data.type = input.type;
  if (input.category) data.category = input.category;
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) data.amount = encryptNumber(input.amount);
  if (input.frequency) data.frequency = input.frequency;
  if (input.day_of_month !== undefined) data.day_of_month = input.day_of_month;
  if (input.day_of_week !== undefined) data.day_of_week = input.day_of_week;
  if (input.start_date) data.start_date = new Date(input.start_date);
  if (input.end_date !== undefined) data.end_date = input.end_date ? new Date(input.end_date) : null;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  const recurring = await prisma.recurringTransaction.updateMany({
    where: { id, user_id: userId },
    data,
  });

  return recurring.count > 0;
}

export async function deleteRecurring(userId: bigint, id: bigint) {
  await prisma.recurringTransaction.deleteMany({
    where: { id, user_id: userId },
  });
}

export async function processRecurrings(userId: bigint) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recurrings = await prisma.recurringTransaction.findMany({
    where: {
      user_id: userId,
      is_active: true,
      start_date: { lte: today },
      OR: [{ end_date: null }, { end_date: { gte: today } }],
    },
  });

  const created: string[] = [];

  for (const rec of recurrings) {
    const shouldRun = shouldRunToday(rec, today);
    if (!shouldRun) continue;

    // Check if already run today
    if (rec.last_run) {
      const lastRun = new Date(rec.last_run);
      lastRun.setHours(0, 0, 0, 0);
      if (lastRun.getTime() === today.getTime()) continue;
    }

    // Create transaction
    await prisma.transaction.create({
      data: {
        user_id: userId,
        date: today,
        type: rec.type,
        category: rec.category,
        description: `[Auto] ${rec.description}`,
        amount: rec.amount,
      },
    });

    // Update last_run
    await prisma.recurringTransaction.update({
      where: { id: rec.id },
      data: { last_run: today },
    });

    created.push(rec.category);
  }

  return created;
}

function shouldRunToday(rec: { frequency: string; day_of_month: number | null; day_of_week: number | null }, today: Date): boolean {
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();

  switch (rec.frequency) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return rec.day_of_week === null || rec.day_of_week === dayOfWeek;
    case 'MONTHLY':
      return rec.day_of_month === null || rec.day_of_month === dayOfMonth;
    case 'YEARLY':
      // For yearly, day_of_month stores the day, we'd need month too - simplified to just day
      return rec.day_of_month === null || rec.day_of_month === dayOfMonth;
    default:
      return false;
  }
}

function formatRecurring(rec: {
  id: bigint;
  type: string;
  category: string;
  description: string;
  amount: string;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
  last_run: Date | null;
}): RecurringTransaction {
  return {
    id: rec.id.toString(),
    type: rec.type as 'INCOME' | 'EXPENSE',
    category: rec.category,
    description: rec.description,
    amount: decryptNumber(rec.amount),
    frequency: rec.frequency,
    day_of_month: rec.day_of_month,
    day_of_week: rec.day_of_week,
    start_date: rec.start_date.toISOString().split('T')[0],
    end_date: rec.end_date?.toISOString().split('T')[0] || null,
    is_active: rec.is_active,
    last_run: rec.last_run?.toISOString().split('T')[0] || null,
    next_run: calculateNextRun(rec),
  };
}

function calculateNextRun(rec: { frequency: string; day_of_month: number | null; day_of_week: number | null; start_date: Date; end_date: Date | null; is_active: boolean }): string | null {
  if (!rec.is_active) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let next = new Date(today);

  switch (rec.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      const targetDay = rec.day_of_week ?? 0;
      const currentDay = next.getDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntil);
      break;
    case 'MONTHLY':
      const targetDate = rec.day_of_month ?? 1;
      if (next.getDate() >= targetDate) {
        next.setMonth(next.getMonth() + 1);
      }
      next.setDate(Math.min(targetDate, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  if (rec.end_date && next > rec.end_date) return null;
  
  return next.toISOString().split('T')[0];
}
