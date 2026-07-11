/**
 * Transaction Service
 * 
 * Provides transaction management functionality including:
 * - Create/update/delete transactions
 * - Get transactions by date range
 * - Calculate monthly summary from transactions
 */

import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { isSupportedReceiptDataUrl } from '@/lib/receipt-image';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionInput {
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  account?: string | null;
  receipt_image?: string | null;
}

export interface TransactionRecord {
  id: bigint;
  user_id: bigint;
  date: Date;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  account: string | null;
  receipt_image: string | null;
  has_receipt?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  expense_by_category: Record<string, number>;
}

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Living',
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Other',
] as const;

// Income categories
export const INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Investment',
  'Freelance',
  'Gift',
  'Other',
] as const;

export const ACCOUNT_PRESETS = [
  'Cash',
  'BCA',
  'Mandiri',
  'BRI',
  'BNI',
  'GoPay',
  'OVO',
  'Dana',
  'Credit Card',
] as const;

function normalizeAccount(account: string | null | undefined): string | null {
  const normalized = account?.trim();
  return normalized ? normalized : null;
}

/**
 * Validate transaction input
 */
export function validateTransactionInput(input: TransactionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const account = normalizeAccount(input.account);

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push('Invalid date format. Use YYYY-MM-DD');
  }

  if (!input.type || !['INCOME', 'EXPENSE'].includes(input.type)) {
    errors.push('Type must be INCOME or EXPENSE');
  }

  if (!input.category || input.category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (typeof input.amount !== 'number' || input.amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (account && account.length > 100) {
    errors.push('Account must be at most 100 characters');
  }

  if (input.receipt_image && !isSupportedReceiptDataUrl(input.receipt_image)) {
    errors.push('Receipt image must be a valid JPEG, PNG, or WebP data URL up to 5 MiB');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  userId: bigint,
  input: TransactionInput
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  const validation = validateTransactionInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const encryptedAmount = encryptNumber(input.amount);

  const record = await prisma.transaction.create({
    data: {
      user_id: userId,
      date: new Date(input.date),
      type: input.type,
      category: input.category.trim(),
      description: input.description.trim(),
      amount: encryptedAmount,
      account: normalizeAccount(input.account),
      ...(input.receipt_image !== undefined ? { receipt_image: input.receipt_image } : {}),
    },
  });

  return {
    success: true,
    transaction: {
      id: record.id,
      user_id: record.user_id,
      date: record.date,
      type: record.type as TransactionType,
      category: record.category,
      description: record.description,
      amount: input.amount,
      account: record.account,
      receipt_image: record.receipt_image,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
  };
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  userId: bigint,
  transactionId: bigint,
  input: TransactionInput
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  const validation = validateTransactionInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Check ownership
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, user_id: userId },
  });

  if (!existing) {
    return { success: false, error: 'Transaction not found' };
  }

  const encryptedAmount = encryptNumber(input.amount);

  const record = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      date: new Date(input.date),
      type: input.type,
      category: input.category.trim(),
      description: input.description.trim(),
      amount: encryptedAmount,
      account: normalizeAccount(input.account),
      ...(input.receipt_image !== undefined ? { receipt_image: input.receipt_image } : {}),
    },
  });

  return {
    success: true,
    transaction: {
      id: record.id,
      user_id: record.user_id,
      date: record.date,
      type: record.type as TransactionType,
      category: record.category,
      description: record.description,
      amount: input.amount,
      account: record.account,
      receipt_image: record.receipt_image,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
  };
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  userId: bigint,
  transactionId: bigint
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, user_id: userId },
  });

  if (!existing) {
    return { success: false, error: 'Transaction not found' };
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });

  return { success: true };
}

/**
 * Get transactions for a user within a date range
 */
export async function getTransactions(
  userId: bigint,
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<TransactionRecord[]> {
  const where: { user_id: bigint; date?: { gte?: Date; lte?: Date } } = { user_id: userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const records = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    ...(limit && limit > 0 ? { take: limit } : {}),
  });

  return records.map((record: { id: bigint; user_id: bigint; date: Date; type: string; category: string; description: string; amount: string; account: string | null; receipt_image: string | null; created_at: Date; updated_at: Date }) => ({
    id: record.id,
    user_id: record.user_id,
    date: record.date,
    type: record.type as TransactionType,
    category: record.category,
    description: record.description,
    amount: decryptNumber(record.amount),
    account: record.account,
    receipt_image: null,
    has_receipt: record.receipt_image !== null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }));
}

/**
 * Get monthly summary from transactions
 */
export async function getMonthlySummary(
  userId: bigint,
  month: string // YYYY-MM
): Promise<MonthlySummary> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // Last day of month

  const records = await prisma.transaction.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const expenseByCategory: Record<string, number> = {};

  for (const record of records) {
    const amount = decryptNumber(record.amount);
    
    if (record.type === 'INCOME') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      expenseByCategory[record.category] = (expenseByCategory[record.category] || 0) + amount;
    }
  }

  return {
    month,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_cashflow: totalIncome - totalExpense,
    expense_by_category: expenseByCategory,
  };
}
