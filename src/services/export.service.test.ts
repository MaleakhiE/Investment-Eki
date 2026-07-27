const prisma = {
  user: { findUnique: jest.fn() },
  transaction: { findMany: jest.fn(), count: jest.fn() },
  financialAccount: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  investment: { findMany: jest.fn() },
  investmentSnapshot: { count: jest.fn() },
  budget: { findMany: jest.fn(), count: jest.fn() },
  financialGoal: { findMany: jest.fn(), count: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: prisma }));
jest.mock('@/lib/encryption', () => ({
  decrypt: jest.fn(() => 'person@example.com'),
  decryptNumber: jest.fn((value: string) => Number(value)),
}));

import {
  ExportAccountNotFoundError,
  exportToCSV,
  exportToJSON,
  exportTransactions,
  getExportSummary,
} from './export.service';

const userId = BigInt(20);
const baseTransaction = {
  id: BigInt(99),
  date: new Date('2026-07-21T00:00:00.000Z'),
  type: 'TRANSFER',
  category: 'Transfer',
  description: 'Move funds',
  amount: '125000',
  account: 'Legacy source',
  account_id: BigInt(2),
  destination_account_id: BigInt(3),
  sourceAccount: { name: 'BCA' },
  destinationAccount: { name: 'Mandiri' },
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ email: 'encrypted-email' });
  prisma.transaction.findMany.mockResolvedValue([baseTransaction]);
  prisma.financialAccount.findMany.mockResolvedValue([{
    name: 'BCA',
    type: 'BANK',
    opening_balance: '500000',
    is_archived: false,
  }]);
  prisma.investment.findMany.mockResolvedValue([]);
  prisma.budget.findMany.mockResolvedValue([]);
  prisma.financialGoal.findMany.mockResolvedValue([]);
});

describe('exportToJSON', () => {
  it('returns a versioned account-aware plaintext export without internal identifiers', async () => {
    const data = await exportToJSON(userId);

    expect(data).toEqual(expect.objectContaining({
      export_format: 'fintrack-data-export',
      export_version: 1,
      user_email: 'person@example.com',
      accounts: [{
        name: 'BCA',
        type: 'BANK',
        opening_balance: 500000,
        is_archived: false,
      }],
      transactions: [{
        date: '2026-07-21',
        type: 'TRANSFER',
        category: 'Transfer',
        description: 'Move funds',
        amount: 125000,
        source_account: 'BCA',
        destination_account: 'Mandiri',
      }],
    }));
    expect(data.notable_exclusions).toEqual(expect.arrayContaining([
      'receipt_images',
      'credentials',
      'recurring_rules',
      'notification_settings',
      'operational_database_state',
      'monthly_cashflows',
      'notification_history',
    ]));
    expect(JSON.stringify(data)).not.toMatch(/"(user_id|account_id|destination_account_id|id|receipt_image)":/);
  });

  it('uses explicit selects that exclude receipt images and deterministic ordering', async () => {
    await exportToJSON(userId);

    const query = prisma.transaction.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ user_id: userId });
    expect(query.orderBy).toEqual([{ date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }]);
    expect(query.select.receipt_image).toBeUndefined();
    expect(query.select.user_id).toBeUndefined();
    expect(prisma.financialAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: userId },
      orderBy: [{ is_archived: 'asc' }, { created_at: 'asc' }],
    }));
  });

  it('maps the remaining allowlisted financial records without internal fields', async () => {
    prisma.investment.findMany.mockResolvedValue([{
      type: 'MUTUAL_FUND',
      snapshots: [{
        month: '2026-07',
        invested_amount: '100000',
        current_value: '110000',
        platform: 'Example',
        product_name: 'Fund',
      }],
    }]);
    prisma.budget.findMany.mockResolvedValue([{
      category: 'Food',
      amount: '500000',
      period: '2026-07',
    }]);
    prisma.financialGoal.findMany.mockResolvedValue([{
      name: 'Emergency fund',
      target_amount: '1000000',
      current_amount: '250000',
      deadline: new Date('2026-12-31T00:00:00.000Z'),
      category: 'Safety',
      is_completed: false,
    }]);

    const data = await exportToJSON(userId);

    expect(data.investments).toEqual([expect.objectContaining({ current_value: 110000 })]);
    expect(data.budgets).toEqual([{ category: 'Food', amount: 500000, period: '2026-07' }]);
    expect(data.goals).toEqual([expect.objectContaining({
      name: 'Emergency fund',
      deadline: '2026-12-31',
    })]);
  });
});

describe('exportTransactions', () => {
  it('scopes inclusive dates and an owned archived account to both transfer endpoints', async () => {
    prisma.financialAccount.findFirst.mockResolvedValue({
      id: BigInt(2),
      name: 'Archived BCA',
      is_archived: true,
    });

    await exportTransactions(userId, {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T00:00:00.000Z'),
      accountId: BigInt(2),
    });

    expect(prisma.financialAccount.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(2), user_id: userId },
      select: { id: true, name: true, is_archived: true },
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        user_id: userId,
        date: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-07-31T00:00:00.000Z'),
        },
        OR: [{ account_id: BigInt(2) }, { destination_account_id: BigInt(2) }],
      },
    }));
  });

  it('rejects a missing or cross-user account before querying transactions', async () => {
    prisma.financialAccount.findFirst.mockResolvedValue(null);

    await expect(exportTransactions(userId, { accountId: BigInt(404) }))
      .rejects.toBeInstanceOf(ExportAccountNotFoundError);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['INCOME', BigInt(2), null, 125000],
    ['EXPENSE', BigInt(2), null, -125000],
    ['TRANSFER', BigInt(2), BigInt(3), -125000],
    ['TRANSFER', BigInt(3), BigInt(2), 125000],
  ])('calculates the selected-account delta for %s', async (type, sourceId, destinationId, delta) => {
    prisma.financialAccount.findFirst.mockResolvedValue({
      id: BigInt(2),
      name: 'BCA',
      is_archived: false,
    });
    prisma.transaction.findMany.mockResolvedValue([{
      ...baseTransaction,
      type,
      account_id: sourceId,
      destination_account_id: destinationId,
    }]);

    const rows = await exportTransactions(userId, { accountId: BigInt(2) });

    expect(rows[0].account_delta).toBe(delta);
  });

  it('leaves the delta empty if inconsistent data does not touch the selected account', async () => {
    prisma.financialAccount.findFirst.mockResolvedValue({
      id: BigInt(2),
      name: 'BCA',
      is_archived: false,
    });
    prisma.transaction.findMany.mockResolvedValue([{
      ...baseTransaction,
      account_id: BigInt(3),
      destination_account_id: BigInt(4),
    }]);

    const rows = await exportTransactions(userId, { accountId: BigInt(2) });

    expect(rows[0].account_delta).toBeNull();
  });
});

describe('exportToCSV', () => {
  it('exports transfer endpoints and account-relative delta while preserving CSV quoting', () => {
    const csv = exportToCSV([{
      date: '2026-07-21',
      type: 'TRANSFER',
      category: 'Transfer',
      description: 'Move "rainy day", funds',
      amount: 125000,
      source_account: 'BCA',
      destination_account: 'Mandiri',
      account_delta: -125000,
    }]);

    expect(csv).toBe([
      '"Date","Type","Category","Description","Amount","Source Account","Destination Account","Account Delta"',
      '"2026-07-21","TRANSFER","Transfer","Move ""rainy day"", funds","125000","BCA","Mandiri","-125000"',
    ].join('\n'));
  });

  it('returns headers for an empty transaction export', () => {
    expect(exportToCSV([])).toBe(
      '"Date","Type","Category","Description","Amount","Source Account","Destination Account","Account Delta"',
    );
  });

  it.each([
    ['=SUM(1,1)', "'=SUM(1,1)"],
    ['+cmd', "'+cmd"],
    ['-2+3', "'-2+3"],
    ['@IMPORTXML', "'@IMPORTXML"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', "'\r=1+1"],
    [' =1+1', "' =1+1"],
    ['\n=1+1', "'\n=1+1"],
    ['\uFEFF@SUM(1,1)', "'\uFEFF@SUM(1,1)"],
  ])('neutralizes spreadsheet formula cell %p in every user-controlled column', (value, neutralized) => {
    const csv = exportToCSV([{
      date: '2026-07-21',
      type: 'EXPENSE',
      category: 'Other',
      description: value,
      amount: 1,
      source_account: value,
      destination_account: value,
      account_delta: -1,
    }]);

    expect(csv.split('\n').slice(1).join('\n').match(new RegExp(neutralized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')))
      .toHaveLength(3);
  });
});

describe('getExportSummary', () => {
  it('includes owned active and archived account filter options', async () => {
    prisma.transaction.count.mockResolvedValue(2);
    prisma.investmentSnapshot.count.mockResolvedValue(3);
    prisma.budget.count.mockResolvedValue(4);
    prisma.financialGoal.count.mockResolvedValue(5);
    prisma.financialAccount.findMany.mockResolvedValue([
      { id: BigInt(2), name: 'BCA', is_archived: false },
      { id: BigInt(3), name: 'Old Wallet', is_archived: true },
    ]);

    await expect(getExportSummary(userId)).resolves.toEqual({
      transactions: 2,
      investment_snapshots: 3,
      budgets: 4,
      goals: 5,
      accounts: 2,
      total_records: 16,
      account_options: [
        { id: '2', name: 'BCA', is_archived: false },
        { id: '3', name: 'Old Wallet', is_archived: true },
      ],
    });
  });
});
