/**
 * Cashflow Service
 * 
 * Provides cashflow management functionality including:
 * - Total expense calculation
 * - Net cashflow calculation
 * - Cashflow persistence with encryption
 * - Cashflow history retrieval with decryption
 */

import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { validateCashflowInput, CashflowInput } from '@/lib/validation';

/**
 * Cashflow record with decrypted values
 */
export interface CashflowRecord {
  id: bigint;
  user_id: bigint;
  month: string;
  income: number;
  expense_rent: number;
  expense_living: number;
  expense_other: number;
  total_expense: number;
  net_cashflow: number;
  created_at: Date;
}

/**
 * Calculate total expense from expense breakdown
 * total_expense = expense_rent + expense_living + expense_other
 * 
 * Requirements: 2.1
 */
export function calculateTotalExpense(input: {
  expense_rent: number;
  expense_living: number;
  expense_other: number;
}): number {
  return input.expense_rent + input.expense_living + input.expense_other;
}

/**
 * Calculate net cashflow from income and total expense
 * net_cashflow = income - total_expense
 * 
 * Requirements: 2.2
 */
export function calculateNetCashflow(income: number, totalExpense: number): number {
  return income - totalExpense;
}


export interface SaveCashflowResult {
  success: boolean;
  cashflow?: CashflowRecord;
  error?: string;
}

/**
 * Save or update cashflow data for a user and month
 * Uses upsert logic - creates new record or updates existing
 * All monetary values are encrypted before storing
 * 
 * Requirements: 2.3, 2.5, 10.2
 */
export async function saveCashflow(
  userId: bigint,
  input: CashflowInput
): Promise<SaveCashflowResult> {
  // Validate input
  const validation = validateCashflowInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Calculate derived values
  const totalExpense = calculateTotalExpense(input);
  const netCashflow = calculateNetCashflow(input.income, totalExpense);

  // Encrypt all monetary values
  const encryptedIncome = encryptNumber(input.income);
  const encryptedExpenseRent = encryptNumber(input.expense_rent);
  const encryptedExpenseLiving = encryptNumber(input.expense_living);
  const encryptedExpenseOther = encryptNumber(input.expense_other);
  const encryptedTotalExpense = encryptNumber(totalExpense);
  const encryptedNetCashflow = encryptNumber(netCashflow);

  // Upsert cashflow record
  const record = await prisma.monthlyCashflow.upsert({
    where: {
      user_id_month: {
        user_id: userId,
        month: input.month,
      },
    },
    update: {
      income: encryptedIncome,
      expense_rent: encryptedExpenseRent,
      expense_living: encryptedExpenseLiving,
      expense_other: encryptedExpenseOther,
      total_expense: encryptedTotalExpense,
      net_cashflow: encryptedNetCashflow,
    },
    create: {
      user_id: userId,
      month: input.month,
      income: encryptedIncome,
      expense_rent: encryptedExpenseRent,
      expense_living: encryptedExpenseLiving,
      expense_other: encryptedExpenseOther,
      total_expense: encryptedTotalExpense,
      net_cashflow: encryptedNetCashflow,
    },
  });

  // Return decrypted record
  return {
    success: true,
    cashflow: {
      id: record.id,
      user_id: record.user_id,
      month: record.month,
      income: input.income,
      expense_rent: input.expense_rent,
      expense_living: input.expense_living,
      expense_other: input.expense_other,
      total_expense: totalExpense,
      net_cashflow: netCashflow,
      created_at: record.created_at,
    },
  };
}

/**
 * Get cashflow record by user and month
 * Decrypts monetary values when retrieving
 * 
 * Requirements: 2.4, 10.3
 */
export async function getCashflowByMonth(
  userId: bigint,
  month: string
): Promise<CashflowRecord | null> {
  const record = await prisma.monthlyCashflow.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month: month,
      },
    },
  });

  if (!record) {
    return null;
  }

  // Decrypt monetary values
  return {
    id: record.id,
    user_id: record.user_id,
    month: record.month,
    income: decryptNumber(record.income),
    expense_rent: decryptNumber(record.expense_rent),
    expense_living: decryptNumber(record.expense_living),
    expense_other: decryptNumber(record.expense_other),
    total_expense: decryptNumber(record.total_expense),
    net_cashflow: decryptNumber(record.net_cashflow),
    created_at: record.created_at,
  };
}


/**
 * Get all cashflow records for a user, ordered by month
 * Decrypts monetary values when retrieving
 * 
 * Requirements: 2.4, 10.3, 10.5
 */
export async function getCashflowHistory(userId: bigint): Promise<CashflowRecord[]> {
  const records = await prisma.monthlyCashflow.findMany({
    where: { user_id: userId },
    orderBy: { month: 'desc' },
  });

  // Decrypt monetary values for each record
  return records.map((record) => ({
    id: record.id,
    user_id: record.user_id,
    month: record.month,
    income: decryptNumber(record.income),
    expense_rent: decryptNumber(record.expense_rent),
    expense_living: decryptNumber(record.expense_living),
    expense_other: decryptNumber(record.expense_other),
    total_expense: decryptNumber(record.total_expense),
    net_cashflow: decryptNumber(record.net_cashflow),
    created_at: record.created_at,
  }));
}
