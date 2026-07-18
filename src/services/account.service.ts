import { prisma } from '@/lib/prisma';
import { decryptNumber, encryptNumber } from '@/lib/encryption';

export type AccountType = 'BANK' | 'WALLET' | 'CASH';

export interface AccountInput {
  name: string;
  type: AccountType;
  opening_balance: number;
  color?: string | null;
}

export interface AccountRecord {
  id: bigint;
  user_id: bigint;
  name: string;
  type: AccountType;
  opening_balance: number;
  balance: number;
  color: string | null;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AccountBalanceEntry {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  account_id: bigint | null;
  destination_account_id: bigint | null;
}

interface ValidAccountInput {
  valid: boolean;
  errors: string[];
  value?: AccountInput & { color: string | null };
}

export function validateAccountInput(input: AccountInput): ValidAccountInput {
  const name = input.name?.trim() ?? '';
  const color = input.color?.trim() || null;
  const errors: string[] = [];

  if (!name) errors.push('Account name is required');
  else if (name.length > 100) errors.push('Account name must be at most 100 characters');

  if (!['BANK', 'WALLET', 'CASH'].includes(input.type)) {
    errors.push('Account type must be BANK, WALLET, or CASH');
  }
  if (!Number.isFinite(input.opening_balance) || input.opening_balance < 0) {
    errors.push('Opening balance cannot be negative');
  }
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    errors.push('Color must be a six-digit hex value');
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, errors: [], value: { name, type: input.type, opening_balance: input.opening_balance, color } };
}

export function calculateAccountBalance(
  accountId: bigint,
  openingBalance: number,
  entries: AccountBalanceEntry[]
): number {
  return entries.reduce((balance, entry) => {
    if (entry.type === 'INCOME' && entry.account_id === accountId) return balance + entry.amount;
    if (entry.type === 'EXPENSE' && entry.account_id === accountId) return balance - entry.amount;
    if (entry.type === 'TRANSFER' && entry.account_id === accountId) return balance - entry.amount;
    if (entry.type === 'TRANSFER' && entry.destination_account_id === accountId) return balance + entry.amount;
    return balance;
  }, openingBalance);
}

function toAccountRecord(
  account: {
    id: bigint;
    user_id: bigint;
    name: string;
    type: AccountType;
    opening_balance: string | null;
    color: string | null;
    is_archived: boolean;
    created_at: Date;
    updated_at: Date;
  },
  entries: AccountBalanceEntry[] = []
): AccountRecord {
  const openingBalance = account.opening_balance ? decryptNumber(account.opening_balance) : 0;
  return {
    ...account,
    opening_balance: openingBalance,
    balance: calculateAccountBalance(account.id, openingBalance, entries),
  };
}

export async function getAccounts(userId: bigint, includeArchived = false): Promise<AccountRecord[]> {
  const accounts = await prisma.financialAccount.findMany({
    where: { user_id: userId, ...(includeArchived ? {} : { is_archived: false }) },
    orderBy: [{ is_archived: 'asc' }, { created_at: 'asc' }],
  });
  const accountIds = accounts.map((account) => account.id);
  const transactions = accountIds.length === 0 ? [] : await prisma.transaction.findMany({
    where: {
      user_id: userId,
      OR: [
        { account_id: { in: accountIds } },
        { destination_account_id: { in: accountIds } },
      ],
    },
    select: { type: true, amount: true, account_id: true, destination_account_id: true },
  });
  const entries: AccountBalanceEntry[] = transactions.map((transaction) => ({
    ...transaction,
    type: transaction.type as AccountBalanceEntry['type'],
    amount: decryptNumber(transaction.amount),
  }));

  return accounts.map((account) => toAccountRecord({ ...account, type: account.type as AccountType }, entries));
}

export async function createAccount(
  userId: bigint,
  input: AccountInput
): Promise<{ success: boolean; account?: AccountRecord; error?: string }> {
  const validation = validateAccountInput(input);
  if (!validation.valid || !validation.value) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const existing = await prisma.financialAccount.findFirst({
    where: { user_id: userId, name: validation.value.name },
    select: { id: true },
  });
  if (existing) return { success: false, error: 'An account with this name already exists' };

  const record = await prisma.financialAccount.create({
    data: {
      user_id: userId,
      name: validation.value.name,
      type: validation.value.type,
      opening_balance: encryptNumber(validation.value.opening_balance),
      color: validation.value.color,
    },
  });

  return {
    success: true,
    account: toAccountRecord({ ...record, type: record.type as AccountType }),
  };
}

export async function updateAccount(
  userId: bigint,
  accountId: bigint,
  input: AccountInput
): Promise<{ success: boolean; account?: AccountRecord; error?: string }> {
  const validation = validateAccountInput(input);
  if (!validation.valid || !validation.value) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const ownedAccount = await prisma.financialAccount.findFirst({
    where: { id: accountId, user_id: userId },
    select: { id: true, user_id: true },
  });
  if (!ownedAccount) return { success: false, error: 'Account not found' };

  const duplicate = await prisma.financialAccount.findFirst({
    where: { user_id: userId, name: validation.value.name, id: { not: accountId } },
    select: { id: true },
  });
  if (duplicate) return { success: false, error: 'An account with this name already exists' };

  const record = await prisma.financialAccount.update({
    where: { id: accountId },
    data: {
      name: validation.value.name,
      type: validation.value.type,
      opening_balance: encryptNumber(validation.value.opening_balance),
      color: validation.value.color,
    },
  });

  return { success: true, account: toAccountRecord({ ...record, type: record.type as AccountType }) };
}

export async function archiveAccount(
  userId: bigint,
  accountId: bigint
): Promise<{ success: boolean; error?: string }> {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, user_id: userId },
    select: { id: true },
  });
  if (!account) return { success: false, error: 'Account not found' };

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { is_archived: true },
  });
  return { success: true };
}
