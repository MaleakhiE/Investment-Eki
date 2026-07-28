import prisma from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { isFinitePositiveAmount, parseCalendarDate } from '@/lib/financial-input';

export class RecurringInputError extends Error {}

const SAFE_RECURRING_ERROR_CODES = new Set(['P1001', 'P2002', 'P2025', 'P2034']);

export function getSafeRecurringErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'UNCLASSIFIED';
  const code = 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && SAFE_RECURRING_ERROR_CODES.has(code)) return code;
  return error instanceof TypeError ? 'TYPE_ERROR' : 'UNCLASSIFIED';
}

export interface RecurringInput {
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  day_of_month?: number;
  day_of_week?: number;
  month_of_year?: number;
  account_id?: string;
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
  month_of_year: number | null;
  account_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

export async function createRecurring(userId: bigint, input: RecurringInput) {
  validateRecurringSchedule(input);
  if (input.account_id) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: BigInt(input.account_id), user_id: userId, is_archived: false },
      select: { id: true },
    });
    if (!account) throw new RecurringInputError('Account not found');
  }
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
      month_of_year: input.month_of_year,
      account_id: input.account_id ? BigInt(input.account_id) : null,
      start_date: parseCalendarDate(input.start_date)!,
      end_date: input.end_date ? parseCalendarDate(input.end_date) : null,
    },
  });

  return formatRecurring(recurring);
}

function validateRecurringSchedule(input: RecurringInput): void {
  if (!isFinitePositiveAmount(input.amount)) {
    throw new RecurringInputError('Amount must be a positive number');
  }
  if (!parseCalendarDate(input.start_date)) {
    throw new RecurringInputError('Invalid start date. Use YYYY-MM-DD');
  }
  if (
    input.end_date !== undefined
    && input.end_date !== null
    && input.end_date !== ''
    && !parseCalendarDate(input.end_date)
  ) {
    throw new RecurringInputError('Invalid end date. Use YYYY-MM-DD');
  }
  if (input.frequency === 'WEEKLY' && (input.day_of_week === undefined || input.day_of_week < 0 || input.day_of_week > 6)) {
    throw new RecurringInputError('Weekly recurring transactions require day_of_week from 0 to 6');
  }
  if ((input.frequency === 'MONTHLY' || input.frequency === 'YEARLY')
    && (input.day_of_month === undefined || input.day_of_month < 1 || input.day_of_month > 31)) {
    throw new RecurringInputError('Monthly and yearly recurring transactions require day_of_month from 1 to 31');
  }
  if (input.frequency === 'YEARLY'
    && (input.month_of_year === undefined || input.month_of_year < 1 || input.month_of_year > 12)) {
    throw new RecurringInputError('Yearly recurring transactions require month_of_year from 1 to 12');
  }
}

export async function getRecurrings(userId: bigint): Promise<RecurringTransaction[]> {
  const recurrings = await prisma.recurringTransaction.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  return recurrings.map(formatRecurring);
}

export async function updateRecurring(userId: bigint, id: bigint, input: Partial<RecurringInput> & { is_active?: boolean }) {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, user_id: userId } });
  if (!existing) return false;
  if (input.amount !== undefined && !isFinitePositiveAmount(input.amount)) {
    throw new RecurringInputError('Amount must be a positive number');
  }
  const startDate = input.start_date === undefined ? undefined : parseCalendarDate(input.start_date);
  if (input.start_date !== undefined && !startDate) {
    throw new RecurringInputError('Invalid start date. Use YYYY-MM-DD');
  }
  validateRecurringSchedule({
    type: (input.type ?? existing.type) as 'INCOME' | 'EXPENSE',
    category: input.category ?? existing.category,
    description: input.description ?? existing.description,
    amount: input.amount ?? decryptNumber(existing.amount),
    frequency: (input.frequency ?? existing.frequency) as RecurringInput['frequency'],
    day_of_month: input.day_of_month ?? existing.day_of_month ?? undefined,
    day_of_week: input.day_of_week ?? existing.day_of_week ?? undefined,
    month_of_year: input.month_of_year ?? existing.month_of_year ?? undefined,
    account_id: input.account_id ?? existing.account_id?.toString(),
    start_date: startDate?.toISOString().slice(0, 10) ?? existing.start_date.toISOString().slice(0, 10),
    end_date: input.end_date ?? existing.end_date?.toISOString().slice(0, 10),
  });
  if (input.account_id !== undefined) {
    const account = input.account_id ? await prisma.financialAccount.findFirst({
      where: { id: BigInt(input.account_id), user_id: userId, is_archived: false },
      select: { id: true },
    }) : null;
    if (input.account_id && !account) throw new RecurringInputError('Account not found');
  }
  const data: Record<string, unknown> = {};
  if (input.type) data.type = input.type;
  if (input.category) data.category = input.category;
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) data.amount = encryptNumber(input.amount);
  if (input.frequency) data.frequency = input.frequency;
  if (input.day_of_month !== undefined) data.day_of_month = input.day_of_month;
  if (input.day_of_week !== undefined) data.day_of_week = input.day_of_week;
  if (input.month_of_year !== undefined) data.month_of_year = input.month_of_year;
  if (input.account_id !== undefined) data.account_id = input.account_id ? BigInt(input.account_id) : null;
  if (startDate) data.start_date = startDate;
  if (input.end_date !== undefined) {
    data.end_date = input.end_date ? parseCalendarDate(input.end_date) : null;
  }
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

export interface ProcessRecurringResult {
  created: string[];
  skipped: string[];
  failed: string[];
}

export async function processDueRecurrings(
  userId: bigint,
  asOf: Date = new Date(),
): Promise<ProcessRecurringResult> {
  const scheduledDate = getJakartaCalendarDate(asOf);
  const recurrings = await prisma.recurringTransaction.findMany({
    where: {
      user_id: userId,
      is_active: true,
      start_date: { lte: scheduledDate },
      OR: [{ end_date: null }, { end_date: { gte: scheduledDate } }],
    },
    include: { account: { select: { id: true, name: true } } },
  });

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const rec of recurrings) {
    if (!isDueOn(rec, scheduledDate)) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const occurrence = await tx.recurringOccurrence.create({
          data: { recurring_transaction_id: rec.id, scheduled_date: scheduledDate },
        });
        const posted = await tx.transaction.create({
          data: {
            user_id: userId,
            date: scheduledDate,
            type: rec.type,
            category: rec.category,
            description: `[Auto] ${rec.description}`,
            amount: rec.amount,
            account_id: rec.account_id,
            account: rec.account?.name ?? null,
          },
        });
        await tx.recurringOccurrence.update({
          where: { id: occurrence.id },
          data: { transaction_id: posted.id },
        });
        await tx.recurringTransaction.update({
          where: { id: rec.id },
          data: { last_run: scheduledDate },
        });
      });
      created.push(rec.category);
    } catch (error) {
      if (isUniqueConstraintError(error)) skipped.push(rec.category);
      else {
        console.error('Recurring transaction posting failed', {
          code: getSafeRecurringErrorCode(error),
        });
        failed.push(rec.category);
      }
    }
  }

  return { created, skipped, failed };
}

export async function processRecurrings(userId: bigint): Promise<string[]> {
  return (await processDueRecurrings(userId)).created;
}

export async function processAllDueRecurrings(asOf: Date = new Date()): Promise<{
  created: number;
  skipped: number;
  failed: number;
}> {
  const owners = await prisma.recurringTransaction.findMany({
    where: { is_active: true },
    select: { user_id: true },
    distinct: ['user_id'],
  });
  const totals = { created: 0, skipped: 0, failed: 0 };
  for (const owner of owners) {
    const result = await processDueRecurrings(owner.user_id, asOf);
    totals.created += result.created.length;
    totals.skipped += result.skipped.length;
    totals.failed += result.failed.length;
  }
  return totals;
}

function isDueOn(
  rec: { frequency: string; day_of_month: number | null; day_of_week: number | null; month_of_year: number | null },
  date: Date,
): boolean {
  const dayOfWeek = date.getUTCDay();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const configuredDay = rec.day_of_month ?? 1;
  const finalDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), month, 0)).getUTCDate();
  const effectiveDay = Math.min(configuredDay, finalDayOfMonth);

  switch (rec.frequency) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return rec.day_of_week === null || rec.day_of_week === dayOfWeek;
    case 'MONTHLY':
      return dayOfMonth === effectiveDay;
    case 'YEARLY':
      return rec.month_of_year === month && dayOfMonth === effectiveDay;
    default:
      return false;
  }
}

function getJakartaCalendarDate(value: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(number('year'), number('month') - 1, number('day')));
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
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
  month_of_year: number | null;
  account_id: bigint | null;
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
    month_of_year: rec.month_of_year,
    account_id: rec.account_id?.toString() ?? null,
    start_date: rec.start_date.toISOString().split('T')[0],
    end_date: rec.end_date?.toISOString().split('T')[0] || null,
    is_active: rec.is_active,
    last_run: rec.last_run?.toISOString().split('T')[0] || null,
    next_run: calculateNextRun(rec),
  };
}

function calculateNextRun(rec: { frequency: string; day_of_month: number | null; day_of_week: number | null; month_of_year: number | null; start_date: Date; end_date: Date | null; is_active: boolean }): string | null {
  if (!rec.is_active) return null;

  const today = getJakartaCalendarDate(new Date());
  let next = new Date(today);

  switch (rec.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      const targetDay = rec.day_of_week ?? 0;
      const currentDay = next.getUTCDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;
    case 'MONTHLY':
      next = calendarDate(today.getUTCFullYear(), today.getUTCMonth() + 1, rec.day_of_month ?? 1);
      if (next <= today) next = calendarDate(today.getUTCFullYear(), today.getUTCMonth() + 2, rec.day_of_month ?? 1);
      break;
    case 'YEARLY':
      next = calendarDate(today.getUTCFullYear(), rec.month_of_year ?? 1, rec.day_of_month ?? 1);
      if (next <= today) next = calendarDate(today.getUTCFullYear() + 1, rec.month_of_year ?? 1, rec.day_of_month ?? 1);
      break;
  }

  if (rec.end_date && next > rec.end_date) return null;
  
  return next.toISOString().split('T')[0];
}

function calendarDate(year: number, oneBasedMonth: number, requestedDay: number): Date {
  const normalized = new Date(Date.UTC(year, oneBasedMonth - 1, 1));
  const finalDay = new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), Math.min(requestedDay, finalDay)));
}
