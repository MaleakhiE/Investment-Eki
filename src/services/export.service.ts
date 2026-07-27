import prisma from '@/lib/prisma';
import { decrypt, decryptNumber } from '@/lib/encryption';

export class ExportAccountNotFoundError extends Error {
  constructor() {
    super('Account not found');
    this.name = 'ExportAccountNotFoundError';
  }
}

export interface ExportTransaction {
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  source_account: string | null;
  destination_account: string | null;
  account_delta?: number | null;
}

export interface TransactionExportFilters {
  from?: Date;
  to?: Date;
  accountId?: bigint;
}

export interface ExportData {
  export_format: 'fintrack-data-export';
  export_version: 1;
  exported_at: string;
  user_email: string;
  notable_exclusions: string[];
  accounts: {
    name: string;
    type: string;
    opening_balance: number;
    is_archived: boolean;
  }[];
  transactions: ExportTransaction[];
  investments: {
    type: string;
    month: string;
    invested_amount: number;
    current_value: number;
    platform?: string;
    product_name?: string;
  }[];
  budgets: {
    category: string;
    amount: number;
    period: string;
  }[];
  goals: {
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
    category: string;
    is_completed: boolean;
  }[];
}

const transactionSelect = {
  date: true,
  type: true,
  category: true,
  description: true,
  amount: true,
  account: true,
  account_id: true,
  destination_account_id: true,
  sourceAccount: { select: { name: true } },
  destinationAccount: { select: { name: true } },
} as const;

export async function exportTransactions(
  userId: bigint,
  filters: TransactionExportFilters = {},
): Promise<ExportTransaction[]> {
  if (filters.accountId !== undefined) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: filters.accountId, user_id: userId },
      select: { id: true, name: true, is_archived: true },
    });
    if (!account) throw new ExportAccountNotFoundError();
  }

  const date = filters.from || filters.to
    ? { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: filters.to }) }
    : undefined;
  const transactions = await prisma.transaction.findMany({
    where: {
      user_id: userId,
      ...(date && { date }),
      ...(filters.accountId !== undefined && {
        OR: [
          { account_id: filters.accountId },
          { destination_account_id: filters.accountId },
        ],
      }),
    },
    select: transactionSelect,
    orderBy: [{ date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
  });

  return transactions.map(tx => {
    const amount = decryptNumber(tx.amount);
    return {
      date: tx.date.toISOString().split('T')[0],
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount,
      source_account: tx.sourceAccount?.name || tx.account || null,
      destination_account: tx.destinationAccount?.name || null,
      ...(filters.accountId !== undefined && {
        account_delta: getAccountDelta(
          tx.type,
          amount,
          tx.account_id,
          tx.destination_account_id,
          filters.accountId,
        ),
      }),
    };
  });
}

function getAccountDelta(
  type: string,
  amount: number,
  sourceAccountId: bigint | null,
  destinationAccountId: bigint | null,
  selectedAccountId: bigint,
): number | null {
  if (type === 'TRANSFER') {
    if (sourceAccountId === selectedAccountId) return -amount;
    if (destinationAccountId === selectedAccountId) return amount;
    return null;
  }
  if (sourceAccountId !== selectedAccountId) return null;
  return type === 'INCOME' ? amount : type === 'EXPENSE' ? -amount : null;
}

export async function exportToJSON(userId: bigint): Promise<ExportData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error('User not found');

  const [transactions, accounts, investments, budgets, goals] = await Promise.all([
    exportTransactions(userId),
    prisma.financialAccount.findMany({
      where: { user_id: userId },
      select: { name: true, type: true, opening_balance: true, is_archived: true },
      orderBy: [{ is_archived: 'asc' }, { created_at: 'asc' }],
    }),
    prisma.investment.findMany({
      where: { user_id: userId },
      select: {
        type: true,
        snapshots: {
          select: {
            month: true,
            invested_amount: true,
            current_value: true,
            platform: true,
            product_name: true,
          },
          orderBy: { month: 'desc' },
        },
      },
    }),
    prisma.budget.findMany({
      where: { user_id: userId },
      select: { category: true, amount: true, period: true },
    }),
    prisma.financialGoal.findMany({
      where: { user_id: userId },
      select: {
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
        category: true,
        is_completed: true,
      },
    }),
  ]);

  return {
    export_format: 'fintrack-data-export',
    export_version: 1,
    exported_at: new Date().toISOString(),
    user_email: decrypt(user.email),
    notable_exclusions: [
      'receipt_images',
      'credentials',
      'recurring_rules',
      'notification_settings',
      'operational_database_state',
      'monthly_cashflows',
      'notification_history',
    ],
    accounts: accounts.map(account => ({
      name: account.name,
      type: account.type,
      opening_balance: account.opening_balance ? decryptNumber(account.opening_balance) : 0,
      is_archived: account.is_archived,
    })),
    transactions,
    investments: investments.flatMap(investment =>
      investment.snapshots.map(snapshot => ({
        type: investment.type,
        month: snapshot.month,
        invested_amount: decryptNumber(snapshot.invested_amount),
        current_value: decryptNumber(snapshot.current_value),
        platform: snapshot.platform || undefined,
        product_name: snapshot.product_name || undefined,
      }))
    ),
    budgets: budgets.map(budget => ({
      category: budget.category,
      amount: decryptNumber(budget.amount),
      period: budget.period,
    })),
    goals: goals.map(goal => ({
      name: goal.name,
      target_amount: decryptNumber(goal.target_amount),
      current_amount: decryptNumber(goal.current_amount),
      deadline: goal.deadline?.toISOString().split('T')[0],
      category: goal.category,
      is_completed: goal.is_completed,
    })),
  };
}

export function exportToCSV(transactions: ExportTransaction[]): string {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Amount',
    'Source Account',
    'Destination Account',
    'Account Delta',
  ];
  const rows = transactions.map(tx => [
    tx.date,
    tx.type,
    tx.category,
    tx.description,
    tx.amount,
    tx.source_account || '',
    tx.destination_account || '',
    tx.account_delta ?? '',
  ]);

  return [headers, ...rows]
    .map(row => row.map(escapeCSVCell).join(','))
    .join('\n');
}

function escapeCSVCell(value: string | number): string {
  const rawValue = String(value);
  const spreadsheetSafeValue = typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(rawValue)
    ? `'${rawValue}`
    : rawValue;

  return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`;
}

export async function getExportSummary(userId: bigint) {
  const [txCount, invCount, budgetCount, goalCount, accounts] = await Promise.all([
    prisma.transaction.count({ where: { user_id: userId } }),
    prisma.investmentSnapshot.count({
      where: { investment: { user_id: userId } },
    }),
    prisma.budget.count({ where: { user_id: userId } }),
    prisma.financialGoal.count({ where: { user_id: userId } }),
    prisma.financialAccount.findMany({
      where: { user_id: userId },
      select: { id: true, name: true, is_archived: true },
      orderBy: [{ is_archived: 'asc' }, { created_at: 'asc' }],
    }),
  ]);

  return {
    transactions: txCount,
    investment_snapshots: invCount,
    budgets: budgetCount,
    goals: goalCount,
    accounts: accounts.length,
    total_records: txCount + invCount + budgetCount + goalCount + accounts.length,
    account_options: accounts.map(account => ({
      id: account.id.toString(),
      name: account.name,
      is_archived: account.is_archived,
    })),
  };
}
