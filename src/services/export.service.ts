import prisma from '@/lib/prisma';
import { decryptNumber, decrypt } from '@/lib/encryption';

export interface ExportData {
  exported_at: string;
  user_email: string;
  transactions: {
    date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
  }[];
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

export async function exportToJSON(userId: bigint): Promise<ExportData> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const [transactions, investments, budgets, goals] = await Promise.all([
    prisma.transaction.findMany({ where: { user_id: userId }, orderBy: { date: 'desc' } }),
    prisma.investment.findMany({
      where: { user_id: userId },
      include: { snapshots: { orderBy: { month: 'desc' } } },
    }),
    prisma.budget.findMany({ where: { user_id: userId } }),
    prisma.financialGoal.findMany({ where: { user_id: userId } }),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_email: decrypt(user.email),
    transactions: transactions.map(tx => ({
      date: tx.date.toISOString().split('T')[0],
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount: decryptNumber(tx.amount),
    })),
    investments: investments.flatMap(inv =>
      inv.snapshots.map(snap => ({
        type: inv.type,
        month: snap.month,
        invested_amount: decryptNumber(snap.invested_amount),
        current_value: decryptNumber(snap.current_value),
        platform: snap.platform || undefined,
        product_name: snap.product_name || undefined,
      }))
    ),
    budgets: budgets.map(b => ({
      category: b.category,
      amount: decryptNumber(b.amount),
      period: b.period,
    })),
    goals: goals.map(g => ({
      name: g.name,
      target_amount: decryptNumber(g.target_amount),
      current_amount: decryptNumber(g.current_amount),
      deadline: g.deadline?.toISOString().split('T')[0],
      category: g.category,
      is_completed: g.is_completed,
    })),
  };
}

export function exportToCSV(transactions: ExportData['transactions']): string {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const rows = transactions.map(tx => [
    tx.date,
    tx.type,
    tx.category,
    tx.description,
    tx.amount,
  ]);

  return [headers, ...rows]
    .map(row => row.map(escapeCSVCell).join(','))
    .join('\n');
}

function escapeCSVCell(value: string | number): string {
  const rawValue = String(value);
  // Spreadsheet applications can ignore leading whitespace or a UTF-8 BOM
  // before deciding whether a cell is a formula. Detect against that
  // normalized prefix while preserving the user's original text.
  const spreadsheetSafeValue = /^[\s\uFEFF]*[=+\-@]/.test(rawValue)
    ? `'${rawValue}`
    : rawValue;

  return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`;
}

export async function getExportSummary(userId: bigint) {
  const [txCount, invCount, budgetCount, goalCount] = await Promise.all([
    prisma.transaction.count({ where: { user_id: userId } }),
    prisma.investmentSnapshot.count({
      where: { investment: { user_id: userId } },
    }),
    prisma.budget.count({ where: { user_id: userId } }),
    prisma.financialGoal.count({ where: { user_id: userId } }),
  ]);

  return {
    transactions: txCount,
    investment_snapshots: invCount,
    budgets: budgetCount,
    goals: goalCount,
    total_records: txCount + invCount + budgetCount + goalCount,
  };
}
