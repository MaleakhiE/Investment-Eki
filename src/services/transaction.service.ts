/**
 * Transaction Service
 * 
 * Provides transaction management functionality including:
 * - Create/update/delete transactions
 * - Get transactions by date range
 * - Calculate monthly summary from transactions
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { encryptNumber, decryptNumber } from '@/lib/encryption';
import { isFinitePositiveAmount, parseCalendarDate } from '@/lib/financial-input';
import { isSupportedReceiptDataUrl } from '@/lib/receipt-image';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface TransactionInput {
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  account?: string | null;
  account_id?: string | bigint | null;
  receipt_image?: string | null;
}

export interface TransferInput {
  date: string;
  source_account_id: string | bigint;
  destination_account_id: string | bigint;
  amount: number;
  description: string;
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
  account_id: bigint | null;
  destination_account_id: bigint | null;
  source_account_name?: string | null;
  destination_account_name?: string | null;
  receipt_image: string | null;
  has_receipt?: boolean;
  created_at: Date;
  updated_at: Date;
}

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002';
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

function normalizeIdempotencyKey(value: string | undefined): string | null {
  if (value === undefined) return null;
  return new RegExp(`^[\\x21-\\x7E]{1,${MAX_IDEMPOTENCY_KEY_LENGTH}}$`).test(value)
    ? value
    : null;
}

function matchesIdempotentTransaction(
  record: {
    date: Date;
    type: string;
    category: string;
    description: string;
    amount: string;
    account: string | null;
    account_id: bigint | null;
    receipt_image: string | null;
  },
  input: TransactionInput,
  accountName: string | null,
): boolean {
  return record.date.toISOString().slice(0, 10) === input.date
    && record.type === input.type
    && record.category === input.category.trim()
    && record.description === input.description.trim()
    && decryptNumber(record.amount) === input.amount
    && record.account === (accountName ?? normalizeAccount(input.account))
    && record.account_id === parseAccountId(input.account_id)
    && record.receipt_image === (input.receipt_image ?? null);
}

function formatTransactionRecord(record: {
  id: bigint;
  user_id: bigint;
  date: Date;
  type: string;
  category: string;
  description: string;
  amount: string;
  account: string | null;
  account_id: bigint | null;
  destination_account_id: bigint | null;
  receipt_image: string | null;
  created_at: Date;
  updated_at: Date;
}): TransactionRecord {
  return {
    id: record.id,
    user_id: record.user_id,
    date: record.date,
    type: record.type as TransactionType,
    category: record.category,
    description: record.description,
    amount: decryptNumber(record.amount),
    account: record.account,
    account_id: record.account_id,
    destination_account_id: record.destination_account_id,
    receipt_image: record.receipt_image,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function parseAccountId(value: string | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    const accountId = typeof value === 'bigint' ? value : BigInt(value);
    return accountId > 0 ? accountId : null;
  } catch {
    return null;
  }
}

type TransactionDatabaseClient = Pick<Prisma.TransactionClient, 'financialAccount' | 'transaction'>;

async function findOwnedAccount(
  userId: bigint,
  accountId: bigint,
  databaseClient: TransactionDatabaseClient = prisma,
) {
  return databaseClient.financialAccount.findFirst({
    where: { id: accountId, user_id: userId, is_archived: false },
    select: { id: true, name: true },
  });
}

/**
 * Validate transaction input
 */
export function validateTransactionInput(input: TransactionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const account = normalizeAccount(input.account);

  if (!parseCalendarDate(input.date)) {
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

  if (!isFinitePositiveAmount(input.amount)) {
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
  input: TransactionInput,
  databaseClient: TransactionDatabaseClient = prisma,
  idempotencyKey?: string,
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string; replayed?: boolean }> {
  const validation = validateTransactionInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  if (idempotencyKey !== undefined && !normalizeIdempotencyKey(idempotencyKey)) {
    return { success: false, error: 'Idempotency-Key must be 1-128 visible ASCII characters' };
  }

  const encryptedAmount = encryptNumber(input.amount);
  const requestedAccountId = parseAccountId(input.account_id);
  if (input.account_id !== undefined && !requestedAccountId) {
    return { success: false, error: 'Account not found' };
  }
  const linkedAccount = requestedAccountId
    ? await findOwnedAccount(userId, requestedAccountId, databaseClient)
    : null;
  if (requestedAccountId && !linkedAccount) return { success: false, error: 'Account not found' };

  const normalizedIdempotencyKey = idempotencyKey ? normalizeIdempotencyKey(idempotencyKey) : null;
  if (normalizedIdempotencyKey) {
    const existing = await databaseClient.transaction.findFirst({
      where: { user_id: userId, idempotency_key: normalizedIdempotencyKey },
    });
    if (existing) {
      if (!matchesIdempotentTransaction(existing, input, linkedAccount?.name ?? null)) {
        return { success: false, error: 'Idempotency key already used for a different transaction' };
      }
      return { success: true, replayed: true, transaction: formatTransactionRecord(existing) };
    }
  }

  let record;
  try {
    record = await databaseClient.transaction.create({
      data: {
        user_id: userId,
        date: parseCalendarDate(input.date)!,
        type: input.type,
        category: input.category.trim(),
        description: input.description.trim(),
        amount: encryptedAmount,
        account: linkedAccount?.name ?? normalizeAccount(input.account),
        ...(requestedAccountId ? { account_id: requestedAccountId } : {}),
        ...(input.receipt_image !== undefined ? { receipt_image: input.receipt_image } : {}),
        ...(normalizedIdempotencyKey ? { idempotency_key: normalizedIdempotencyKey } : {}),
      },
    });
  } catch (error) {
    if (!normalizedIdempotencyKey || !isUniqueConstraintError(error)) throw error;
    const existing = await databaseClient.transaction.findFirst({
      where: { user_id: userId, idempotency_key: normalizedIdempotencyKey },
    });
    if (!existing) throw error;
    if (!matchesIdempotentTransaction(existing, input, linkedAccount?.name ?? null)) {
      return { success: false, error: 'Idempotency key already used for a different transaction' };
    }
    return { success: true, replayed: true, transaction: formatTransactionRecord(existing) };
  }

  return {
    success: true,
    transaction: formatTransactionRecord(record),
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

  if (existing.type === 'TRANSFER') {
    return { success: false, error: 'Transfers must be edited through the transfer workflow' };
  }

  const encryptedAmount = encryptNumber(input.amount);
  const requestedAccountId = parseAccountId(input.account_id);
  if (input.account_id !== undefined && input.account_id !== null && !requestedAccountId) {
    return { success: false, error: 'Account not found' };
  }
  const linkedAccount = requestedAccountId ? await findOwnedAccount(userId, requestedAccountId) : null;
  if (requestedAccountId && !linkedAccount) return { success: false, error: 'Account not found' };

  const record = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      date: parseCalendarDate(input.date)!,
      type: input.type,
      category: input.category.trim(),
      description: input.description.trim(),
      amount: encryptedAmount,
      account: linkedAccount?.name ?? normalizeAccount(input.account),
      ...(input.account_id !== undefined ? { account_id: requestedAccountId } : {}),
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
      account_id: record.account_id,
      destination_account_id: record.destination_account_id,
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
    include: {
      sourceAccount: { select: { name: true } },
      destinationAccount: { select: { name: true } },
    },
    ...(limit && limit > 0 ? { take: limit } : {}),
  });

  return records.map((record) => ({
    id: record.id,
    user_id: record.user_id,
    date: record.date,
    type: record.type as TransactionType,
    category: record.category,
    description: record.description,
    amount: decryptNumber(record.amount),
    account: record.sourceAccount?.name ?? record.account,
    account_id: record.account_id,
    destination_account_id: record.destination_account_id,
    source_account_name: record.sourceAccount?.name ?? record.account,
    destination_account_name: record.destinationAccount?.name ?? null,
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
  const expenseByCategory = new Map<string, number>();

  for (const record of records) {
    const amount = decryptNumber(record.amount);
    
    if (record.type === 'INCOME') {
      totalIncome += amount;
    } else if (record.type === 'EXPENSE') {
      totalExpense += amount;
      expenseByCategory.set(record.category, (expenseByCategory.get(record.category) ?? 0) + amount);
    }
  }

  return {
    month,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_cashflow: totalIncome - totalExpense,
    expense_by_category: Object.fromEntries(expenseByCategory),
  };
}

export async function createTransfer(
  userId: bigint,
  input: TransferInput
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  const transactionDate = parseCalendarDate(input.date);
  if (!transactionDate) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  if (!isFinitePositiveAmount(input.amount)) {
    return { success: false, error: 'Amount must be a positive number' };
  }

  const sourceId = parseAccountId(input.source_account_id);
  const destinationId = parseAccountId(input.destination_account_id);
  if (!sourceId || !destinationId) return { success: false, error: 'Source and destination accounts are required' };
  if (sourceId === destinationId) {
    return { success: false, error: 'Source and destination accounts must be different' };
  }

  return prisma.$transaction(async (client) => {
    const accounts = await client.financialAccount.findMany({
      where: { id: { in: [sourceId, destinationId] }, user_id: userId, is_archived: false },
      select: { id: true, name: true },
    });
    if (accounts.length !== 2) return { success: false, error: 'One or more accounts were not found' };

    const source = accounts.find((account) => account.id === sourceId);
    const destination = accounts.find((account) => account.id === destinationId);
    if (!source || !destination) return { success: false, error: 'Source or destination account not found' };

    const record = await client.transaction.create({
      data: {
        user_id: userId,
        date: transactionDate,
        type: 'TRANSFER',
        category: 'Transfer',
        description: typeof input.description === 'string' && input.description.trim()
          ? input.description.trim()
          : 'Account transfer',
        amount: encryptNumber(input.amount),
        account: source.name,
        account_id: sourceId,
        destination_account_id: destinationId,
      },
    });

    return {
      success: true,
      transaction: {
        id: record.id,
        user_id: record.user_id,
        date: record.date,
        type: 'TRANSFER' as const,
        category: record.category,
        description: record.description,
        amount: input.amount,
        account: record.account,
        account_id: record.account_id,
        destination_account_id: record.destination_account_id,
        source_account_name: source.name,
        destination_account_name: destination.name,
        receipt_image: record.receipt_image,
        created_at: record.created_at,
        updated_at: record.updated_at,
      },
    };
  });
}
