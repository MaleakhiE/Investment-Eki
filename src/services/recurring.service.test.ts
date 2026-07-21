const recurringTransaction = {
  findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(),
};
const recurringOccurrence = { create: jest.fn(), update: jest.fn() };
const transactionCreate = { create: jest.fn() };
const financialAccount = { findFirst: jest.fn() };
const txRecurringTransaction = { update: jest.fn() };
const transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback({
  recurringOccurrence,
  transaction: transactionCreate,
  recurringTransaction: txRecurringTransaction,
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    recurringTransaction,
    financialAccount,
    $transaction: transaction,
  },
}));
jest.mock('@/lib/encryption', () => ({
  encryptNumber: (value: number) => `enc:${value}`,
  decryptNumber: (value: string) => Number(value.replace('enc:', '')),
}));

import { createRecurring, getRecurrings, processDueRecurrings, updateRecurring } from './recurring.service';

const monthlyRule = {
  id: BigInt(5), user_id: BigInt(7), type: 'EXPENSE', category: 'Housing',
  description: 'Rent', amount: 'enc:2500000', frequency: 'MONTHLY',
  day_of_month: 31, day_of_week: null, month_of_year: null,
  start_date: new Date('2026-01-01T00:00:00.000Z'), end_date: null,
  is_active: true, last_run: null,
  account_id: BigInt(2), account: { id: BigInt(2), name: 'BCA' },
};

describe('processDueRecurrings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recurringOccurrence.create.mockResolvedValue({ id: BigInt(13) });
    transactionCreate.create.mockResolvedValue({ id: BigInt(17) });
    recurringOccurrence.update.mockResolvedValue({});
    txRecurringTransaction.update.mockResolvedValue({});
  });

  it('posts a month-end occurrence and transaction atomically', async () => {
    recurringTransaction.findMany.mockResolvedValue([monthlyRule]);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-02-28T12:00:00+07:00')))
      .resolves.toEqual({ created: ['Housing'], skipped: [], failed: [] });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(recurringOccurrence.create).toHaveBeenCalledWith({ data: {
      recurring_transaction_id: BigInt(5), scheduled_date: new Date('2026-02-28T00:00:00.000Z'),
    } });
    expect(transactionCreate.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      user_id: BigInt(7), account_id: BigInt(2), account: 'BCA', amount: 'enc:2500000',
    }) });
  });

  it('skips a duplicate occurrence claimed by a concurrent retry', async () => {
    recurringTransaction.findMany.mockResolvedValue([monthlyRule]);
    recurringOccurrence.create.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 'P2002' }));

    await expect(processDueRecurrings(BigInt(7), new Date('2026-02-28T12:00:00+07:00')))
      .resolves.toEqual({ created: [], skipped: ['Housing'], failed: [] });
    expect(transactionCreate.create).not.toHaveBeenCalled();
  });

  it('does not post a yearly rule in the wrong month', async () => {
    recurringTransaction.findMany.mockResolvedValue([{
      ...monthlyRule, frequency: 'YEARLY', day_of_month: 21, month_of_year: 7,
    }]);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-06-21T12:00:00+07:00')))
      .resolves.toEqual({ created: [], skipped: [], failed: [] });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('createRecurring account ownership', () => {
  const input = {
    type: 'EXPENSE' as const, category: 'Housing', description: 'Rent', amount: 1_000_000,
    frequency: 'MONTHLY' as const, day_of_month: 25, start_date: '2026-07-01', account_id: '2',
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects an account that is not an active account owned by the user', async () => {
    financialAccount.findFirst.mockResolvedValue(null);
    await expect(createRecurring(BigInt(7), input)).rejects.toThrow('Account not found');
    expect(recurringTransaction.create).not.toHaveBeenCalled();
  });
});

describe('recurring rule read/update semantics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('returns account/year fields and the next complete yearly occurrence', async () => {
    recurringTransaction.findMany.mockResolvedValue([{
      ...monthlyRule,
      frequency: 'YEARLY', day_of_month: 21, month_of_year: 7,
    }]);

    const [rule] = await getRecurrings(BigInt(7));
    expect(rule).toEqual(expect.objectContaining({
      account_id: '2', month_of_year: 7, next_run: '2026-07-21',
    }));
  });

  it('rejects an update that would leave a yearly rule without a month', async () => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    await expect(updateRecurring(BigInt(7), BigInt(5), { frequency: 'YEARLY' }))
      .rejects.toThrow('month_of_year');
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });
});
