import prisma from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { isFinitePositiveAmount, parseCalendarDate } from '@/lib/financial-input';

export class RecurringInputError extends Error {}

const SAFE_RECURRING_ERROR_CODES = new Set(['P1001', 'P2002', 'P2025', 'P2034']);
const MAX_SIGNED_BIGINT = BigInt('9223372036854775807');
const AUTO_DESCRIPTION_PREFIX = '[Auto] ';
const RECURRING_DESCRIPTION_MAX_CHARACTERS = 512 - Array.from(AUTO_DESCRIPTION_PREFIX).length;
const RECURRING_CATEGORY_MAX_CHARACTERS = 50;

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
  const category = validateRecurringCategory(input.category);
  const description = validateRecurringDescription(input.description ?? '');
  validateRecurringSchedule(input);
  const accountId = parseRecurringAccountId(input.account_id);
  if (accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, user_id: userId, is_archived: false },
      select: { id: true },
    });
    if (!account) throw new RecurringInputError('Account not found');
  }
  const recurring = await prisma.recurringTransaction.create({
    data: {
      user_id: userId,
      type: input.type,
      category,
      description,
      amount: encryptNumber(input.amount),
      frequency: input.frequency,
      day_of_month: input.day_of_month,
      day_of_week: input.day_of_week,
      month_of_year: input.month_of_year,
      account_id: accountId,
      start_date: parseCalendarDate(input.start_date)!,
      end_date: input.end_date ? parseCalendarDate(input.end_date) : null,
    },
  });

  return formatRecurring(recurring);
}

function validateRecurringSchedule(input: {
  type: unknown;
  amount: unknown;
  frequency: unknown;
  day_of_month?: unknown;
  day_of_week?: unknown;
  month_of_year?: unknown;
  start_date: unknown;
  end_date?: unknown;
}): void {
  if (input.type !== 'INCOME' && input.type !== 'EXPENSE') {
    throw new RecurringInputError('Recurring type must be INCOME or EXPENSE');
  }
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(input.frequency as string)) {
    throw new RecurringInputError('Invalid recurring frequency');
  }
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
  if (
    input.day_of_week !== undefined
    && input.day_of_week !== null
    && (!Number.isInteger(input.day_of_week) || (input.day_of_week as number) < 0 || (input.day_of_week as number) > 6)
  ) {
    throw new RecurringInputError('Weekly recurring transactions require day_of_week from 0 to 6');
  }
  if (
    input.day_of_month !== undefined
    && input.day_of_month !== null
    && (!Number.isInteger(input.day_of_month) || (input.day_of_month as number) < 1 || (input.day_of_month as number) > 31)
  ) {
    throw new RecurringInputError('Monthly and yearly recurring transactions require day_of_month from 1 to 31');
  }
  if (
    input.month_of_year !== undefined
    && input.month_of_year !== null
    && (!Number.isInteger(input.month_of_year) || (input.month_of_year as number) < 1 || (input.month_of_year as number) > 12)
  ) {
    throw new RecurringInputError('Yearly recurring transactions require month_of_year from 1 to 12');
  }
  if (input.frequency === 'WEEKLY' && !isIntegerInRange(input.day_of_week, 0, 6)) {
    throw new RecurringInputError('Weekly recurring transactions require day_of_week from 0 to 6');
  }
  if (
    (input.frequency === 'MONTHLY' || input.frequency === 'YEARLY')
    && !isIntegerInRange(input.day_of_month, 1, 31)
  ) {
    throw new RecurringInputError('Monthly and yearly recurring transactions require day_of_month from 1 to 31');
  }
  if (input.frequency === 'YEARLY' && !isIntegerInRange(input.month_of_year, 1, 12)) {
    throw new RecurringInputError('Yearly recurring transactions require month_of_year from 1 to 12');
  }
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum;
}

function parseRecurringAccountId(value: unknown): bigint | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)) {
    throw new RecurringInputError('Invalid account ID');
  }
  const parsed = BigInt(value);
  if (parsed > MAX_SIGNED_BIGINT) {
    throw new RecurringInputError('Invalid account ID');
  }
  return parsed;
}

function hasAtMostCharacters(value: string, maximum: number): boolean {
  let characters = 0;
  for (const character of value) {
    void character;
    if (++characters > maximum) return false;
  }
  return true;
}

function hasValidRecurringCategory(value: string): boolean {
  return hasAtMostCharacters(value, RECURRING_CATEGORY_MAX_CHARACTERS)
    && value.trim().length > 0;
}

function validateRecurringCategory(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RecurringInputError('Category must be a non-empty string');
  }
  if (!hasAtMostCharacters(value, RECURRING_CATEGORY_MAX_CHARACTERS)) {
    throw new RecurringInputError('Category must be at most 50 characters');
  }
  if (value.trim().length === 0) {
    throw new RecurringInputError('Category must be a non-empty string');
  }
  return value;
}

function hasMaterializableDescription(value: string): boolean {
  return hasAtMostCharacters(value, RECURRING_DESCRIPTION_MAX_CHARACTERS);
}

function validateRecurringDescription(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RecurringInputError('Description must be a string');
  }
  if (!hasMaterializableDescription(value)) {
    throw new RecurringInputError('Description must be at most 505 characters');
  }
  return value;
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
  if (input.type !== undefined && input.type !== 'INCOME' && input.type !== 'EXPENSE') {
    throw new RecurringInputError('Recurring type must be INCOME or EXPENSE');
  }
  if (
    input.frequency !== undefined
    && !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(input.frequency)
  ) {
    throw new RecurringInputError('Invalid recurring frequency');
  }
  if (input.is_active !== undefined && typeof input.is_active !== 'boolean') {
    throw new RecurringInputError('is_active must be a boolean');
  }
  if (input.amount !== undefined && !isFinitePositiveAmount(input.amount)) {
    throw new RecurringInputError('Amount must be a positive number');
  }
  const category = input.category === undefined
    ? undefined
    : validateRecurringCategory(input.category);
  if (input.is_active === true && category === undefined) {
    validateRecurringCategory(existing.category);
  }
  const description = input.description === undefined
    ? undefined
    : validateRecurringDescription(input.description ?? '');
  if (input.is_active === true && description === undefined) {
    validateRecurringDescription(existing.description);
  }
  const startDate = input.start_date === undefined ? undefined : parseCalendarDate(input.start_date);
  if (input.start_date !== undefined && !startDate) {
    throw new RecurringInputError('Invalid start date. Use YYYY-MM-DD');
  }
  validateRecurringSchedule({
    type: (input.type === undefined ? existing.type : input.type) as 'INCOME' | 'EXPENSE',
    amount: input.amount ?? decryptNumber(existing.amount),
    frequency: (input.frequency === undefined ? existing.frequency : input.frequency) as RecurringInput['frequency'],
    day_of_month: input.day_of_month === undefined ? existing.day_of_month : input.day_of_month,
    day_of_week: input.day_of_week === undefined ? existing.day_of_week : input.day_of_week,
    month_of_year: input.month_of_year === undefined ? existing.month_of_year : input.month_of_year,
    start_date: startDate?.toISOString().slice(0, 10) ?? existing.start_date.toISOString().slice(0, 10),
    end_date: input.end_date ?? existing.end_date?.toISOString().slice(0, 10),
  });
  const accountId = input.account_id === undefined
    ? undefined
    : parseRecurringAccountId(input.account_id);
  if (accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, user_id: userId, is_archived: false },
      select: { id: true },
    });
    if (!account) throw new RecurringInputError('Account not found');
  }
  const data: Record<string, unknown> = {};
  if (input.type) data.type = input.type;
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description;
  if (input.amount !== undefined) data.amount = encryptNumber(input.amount);
  if (input.frequency) data.frequency = input.frequency;
  if (input.day_of_month !== undefined) data.day_of_month = input.day_of_month;
  if (input.day_of_week !== undefined) data.day_of_week = input.day_of_week;
  if (input.month_of_year !== undefined) data.month_of_year = input.month_of_year;
  if (accountId !== undefined) data.account_id = accountId;
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
    if (!hasValidRecurringCategory(rec.category) || !hasMaterializableDescription(rec.description)) {
      failed.push(rec.category);
      continue;
    }

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
            description: `${AUTO_DESCRIPTION_PREFIX}${rec.description}`,
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
  rec: { type: string; frequency: string; day_of_month: number | null; day_of_week: number | null; month_of_year: number | null },
  date: Date,
): boolean {
  if (!hasValidRecurringCadence(rec)) return false;
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
      return rec.day_of_week === dayOfWeek;
    case 'MONTHLY':
      return dayOfMonth === effectiveDay;
    case 'YEARLY':
      return rec.month_of_year === month && dayOfMonth === effectiveDay;
    default:
      return false;
  }
}

function hasValidRecurringCadence(rec: {
  type: string;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  month_of_year: number | null;
}): boolean {
  if (rec.type !== 'INCOME' && rec.type !== 'EXPENSE') return false;
  switch (rec.frequency) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return isIntegerInRange(rec.day_of_week, 0, 6);
    case 'MONTHLY':
      return isIntegerInRange(rec.day_of_month, 1, 31);
    case 'YEARLY':
      return isIntegerInRange(rec.day_of_month, 1, 31)
        && isIntegerInRange(rec.month_of_year, 1, 12);
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

function calculateNextRun(rec: { type: string; frequency: string; category: string; day_of_month: number | null; day_of_week: number | null; month_of_year: number | null; description: string; start_date: Date; end_date: Date | null; is_active: boolean }): string | null {
  if (!rec.is_active || !hasValidRecurringCadence(rec) || !hasValidRecurringCategory(rec.category) || !hasMaterializableDescription(rec.description)) return null;

  const today = getJakartaCalendarDate(new Date());
  let next = new Date(today);

  switch (rec.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      const targetDay = rec.day_of_week!;
      const currentDay = next.getUTCDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;
    case 'MONTHLY':
      next = calendarDate(today.getUTCFullYear(), today.getUTCMonth() + 1, rec.day_of_month!);
      if (next <= today) next = calendarDate(today.getUTCFullYear(), today.getUTCMonth() + 2, rec.day_of_month!);
      break;
    case 'YEARLY':
      next = calendarDate(today.getUTCFullYear(), rec.month_of_year!, rec.day_of_month!);
      if (next <= today) next = calendarDate(today.getUTCFullYear() + 1, rec.month_of_year!, rec.day_of_month!);
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
