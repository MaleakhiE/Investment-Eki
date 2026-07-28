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
const mockEncryptNumber = jest.fn((value: number) => `enc:${value}`);

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    recurringTransaction,
    financialAccount,
    $transaction: transaction,
  },
}));
jest.mock('@/lib/encryption', () => ({
  encryptNumber: mockEncryptNumber,
  decryptNumber: (value: string) => Number(value.replace('enc:', '')),
}));

import {
  createRecurring,
  getRecurrings,
  getSafeRecurringErrorCode,
  processDueRecurrings,
  updateRecurring,
} from './recurring.service';

const monthlyRule = {
  id: BigInt(5), user_id: BigInt(7), type: 'EXPENSE', category: 'Housing',
  description: 'Rent', amount: 'enc:2500000', frequency: 'MONTHLY',
  day_of_month: 31, day_of_week: null, month_of_year: null,
  start_date: new Date('2026-01-01T00:00:00.000Z'), end_date: null,
  is_active: true, last_run: null,
  account_id: BigInt(2), account: { id: BigInt(2), name: 'BCA' },
};

describe('recurring error taxonomy', () => {
  it.each(['P1001', 'P2002', 'P2025', 'P2034'])('keeps allowlisted code %s', (code) => {
    expect(getSafeRecurringErrorCode({ code })).toBe(code);
  });

  it.each([
    new Error('private database details'),
    { code: 'ARBITRARY_PRIVATE_CODE' },
    'P2002',
    null,
  ])('classifies unsafe error %p without returning its details', (error) => {
    expect(getSafeRecurringErrorCode(error)).toBe('UNCLASSIFIED');
  });

  it('classifies type errors without exposing their message', () => {
    expect(getSafeRecurringErrorCode(new TypeError('private payload'))).toBe('TYPE_ERROR');
  });
});

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

  it('creates once and skips an idempotent same-day retry without logging an error', async () => {
    recurringTransaction.findMany.mockResolvedValue([monthlyRule]);
    recurringOccurrence.create
      .mockResolvedValueOnce({ id: BigInt(13) })
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'P2002' }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const asOf = new Date('2026-02-28T12:00:00+07:00');

    await expect(processDueRecurrings(BigInt(7), asOf))
      .resolves.toEqual({ created: ['Housing'], skipped: [], failed: [] });
    await expect(processDueRecurrings(BigInt(7), asOf))
      .resolves.toEqual({ created: [], skipped: ['Housing'], failed: [] });

    expect(transactionCreate.create).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('counts a posting failure and logs only an allowlisted code', async () => {
    const rawError = Object.assign(
      new Error('Rule 5 Housing enc:2500000 failed for user 7 at mysql://private-host'),
      { code: 'P2034', meta: { accountId: BigInt(2) } },
    );
    recurringTransaction.findMany.mockResolvedValue([monthlyRule]);
    transaction.mockRejectedValueOnce(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-02-28T12:00:00+07:00')))
      .resolves.toEqual({ created: [], skipped: [], failed: ['Housing'] });

    expect(consoleError).toHaveBeenCalledWith(
      'Recurring transaction posting failed',
      { code: 'P2034' },
    );
    expect(JSON.stringify(consoleError.mock.calls))
      .not.toMatch(/Rule 5|Housing|2500000|user 7|private-host|accountId/);
    consoleError.mockRestore();
  });

  it('does not post a yearly rule in the wrong month', async () => {
    recurringTransaction.findMany.mockResolvedValue([{
      ...monthlyRule, frequency: 'YEARLY', day_of_month: 21, month_of_year: 7,
    }]);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-06-21T12:00:00+07:00')))
      .resolves.toEqual({ created: [], skipped: [], failed: [] });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('posts a valid weekly rule only on its configured Jakarta weekday', async () => {
    recurringTransaction.findMany.mockResolvedValue([{
      ...monthlyRule, frequency: 'WEEKLY', day_of_month: null, day_of_week: 1,
    }]);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-06-01T12:00:00+07:00')))
      .resolves.toEqual({ created: ['Housing'], skipped: [], failed: [] });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    { type: 'TRANSFER', frequency: 'DAILY', day_of_month: null, day_of_week: null, month_of_year: null },
    { type: 'EXPENSE', frequency: 'WEEKLY', day_of_month: null, day_of_week: null, month_of_year: null },
    { type: 'EXPENSE', frequency: 'MONTHLY', day_of_month: null, day_of_week: null, month_of_year: null },
    { type: 'EXPENSE', frequency: 'YEARLY', day_of_month: 21, day_of_week: null, month_of_year: null },
    { type: 'EXPENSE', frequency: 'FORTNIGHTLY', day_of_month: null, day_of_week: null, month_of_year: null },
  ])('does not materialize a malformed legacy rule %p', async (invalid) => {
    recurringTransaction.findMany.mockResolvedValue([{ ...monthlyRule, ...invalid }]);

    await expect(processDueRecurrings(BigInt(7), new Date('2026-06-01T12:00:00+07:00')))
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

  it.each([
    0, 2, Number.MAX_SAFE_INTEGER + 1, BigInt(2), false, true, [], {}, '0', '00',
    '01', '+1', '-1', ' 1', '1 ', '1.0', '1e3', '0x1', '１２',
    '9223372036854775808', '12345678901234567890', 'private-account',
  ])('rejects invalid account ID %p before lookup, encryption, or create', async (accountId) => {
    await expect(createRecurring(BigInt(7), {
      ...input,
      account_id: accountId as unknown as string,
    })).rejects.toThrow('Invalid account ID');

    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(recurringTransaction.create).not.toHaveBeenCalled();
  });

  it.each([
    { amount: Infinity },
    { amount: -Infinity },
    { amount: NaN },
    { amount: 0 },
    { amount: null as unknown as number },
    { amount: '1000' as unknown as number },
    { start_date: '2026-02-29' },
    { start_date: '0000-01-01' },
    { start_date: 20260701 as unknown as string },
    { end_date: '2026-04-31' },
    { end_date: 0 as unknown as string },
    { type: 'TRANSFER' as unknown as 'EXPENSE' },
    { type: 'expense' as unknown as 'EXPENSE' },
    { type: null as unknown as 'EXPENSE' },
    { frequency: 'FORTNIGHTLY' as unknown as 'MONTHLY' },
    { frequency: null as unknown as 'MONTHLY' },
    { frequency: 'WEEKLY' as const, day_of_week: null as unknown as number },
    { frequency: 'WEEKLY' as const, day_of_week: '2' as unknown as number },
    { frequency: 'WEEKLY' as const, day_of_week: 2.5 },
    { frequency: 'WEEKLY' as const, day_of_week: -1 },
    { frequency: 'WEEKLY' as const, day_of_week: 7 },
    { frequency: 'MONTHLY' as const, day_of_month: null as unknown as number },
    { frequency: 'MONTHLY' as const, day_of_month: 1.5 },
    { frequency: 'MONTHLY' as const, day_of_month: 0 },
    { frequency: 'MONTHLY' as const, day_of_month: 32 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: null as unknown as number },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 12.5 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 0 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 13 },
  ])('rejects invalid financial input before encryption, account lookup, or create', async (invalid) => {
    await expect(createRecurring(BigInt(7), { ...input, ...invalid }))
      .rejects.toBeInstanceOf(Error);

    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(recurringTransaction.create).not.toHaveBeenCalled();
  });

  it('persists a finite fraction and leap date unchanged at UTC midnight', async () => {
    recurringTransaction.create.mockResolvedValue({
      ...monthlyRule,
      amount: 'enc:0.25',
      start_date: new Date('2028-02-29T00:00:00.000Z'),
    });

    await createRecurring(BigInt(7), {
      ...input,
      amount: 0.25,
      start_date: '2028-02-29',
      end_date: '9999-12-31',
      account_id: undefined,
    });

    expect(mockEncryptNumber).toHaveBeenCalledWith(0.25);
    expect(recurringTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 'enc:0.25',
        start_date: new Date('2028-02-29T00:00:00.000Z'),
        end_date: new Date('9999-12-31T00:00:00.000Z'),
      }),
    });
  });

  it.each([undefined, null, ''])('preserves no-account create input %p', async (accountId) => {
    recurringTransaction.create.mockResolvedValue({ ...monthlyRule, account_id: null });

    await createRecurring(BigInt(7), {
      ...input,
      account_id: accountId as unknown as string,
    });

    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(recurringTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ account_id: null }),
    });
  });

  it.each(['1', '9223372036854775807'])(
    'looks up and persists canonical account ID %s once',
    async (accountId) => {
      const parsed = BigInt(accountId);
      financialAccount.findFirst.mockResolvedValue({ id: parsed });
      recurringTransaction.create.mockResolvedValue({ ...monthlyRule, account_id: parsed });

      await createRecurring(BigInt(7), { ...input, account_id: accountId });

      expect(financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: parsed, user_id: BigInt(7), is_archived: false },
        select: { id: true },
      });
      expect(recurringTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ account_id: parsed }),
      });
    },
  );

  it.each([
    { type: 'INCOME' as const, frequency: 'DAILY' as const, day_of_month: undefined },
    { frequency: 'WEEKLY' as const, day_of_week: 0 },
    { frequency: 'WEEKLY' as const, day_of_week: 6 },
    { frequency: 'MONTHLY' as const, day_of_month: 1 },
    { frequency: 'MONTHLY' as const, day_of_month: 31 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 1 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 12 },
  ])('accepts established cadence boundary %p', async (cadence) => {
    recurringTransaction.create.mockResolvedValue(monthlyRule);

    await expect(createRecurring(BigInt(7), {
      ...input,
      ...cadence,
      account_id: undefined,
    })).resolves.toBeDefined();

    expect(recurringTransaction.create).toHaveBeenCalledTimes(1);
  });

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

  it.each([
    { type: 'TRANSFER', frequency: 'DAILY' },
    { type: 'EXPENSE', frequency: 'WEEKLY', day_of_week: null },
    { type: 'EXPENSE', frequency: 'MONTHLY', day_of_month: null },
    { type: 'EXPENSE', frequency: 'YEARLY', day_of_month: 21, month_of_year: null },
    { type: 'EXPENSE', frequency: 'FORTNIGHTLY' },
  ])('reports no next run for malformed legacy rule %p', async (invalid) => {
    recurringTransaction.findMany.mockResolvedValue([{ ...monthlyRule, ...invalid }]);

    const [rule] = await getRecurrings(BigInt(7));

    expect(rule.next_run).toBeNull();
  });

  it.each([
    { frequency: 'DAILY', day_of_month: null, day_of_week: null, expected: '2026-06-02' },
    { frequency: 'WEEKLY', day_of_month: null, day_of_week: 1, expected: '2026-06-08' },
    { frequency: 'MONTHLY', day_of_month: 31, day_of_week: null, expected: '2026-06-30' },
  ])('preserves the valid $frequency next run', async ({ expected, ...cadence }) => {
    recurringTransaction.findMany.mockResolvedValue([{ ...monthlyRule, ...cadence }]);

    const [rule] = await getRecurrings(BigInt(7));

    expect(rule.next_run).toBe(expected);
  });

  it('rejects an update that would leave a yearly rule without a month', async () => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    await expect(updateRecurring(BigInt(7), BigInt(5), { frequency: 'YEARLY' }))
      .rejects.toThrow('month_of_year');
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { amount: null as unknown as number },
    { amount: Infinity },
    { start_date: '2026-02-29' },
    { start_date: null as unknown as string },
    { start_date: '' },
    { start_date: 20260701 as unknown as string },
    { end_date: '0999-12-31' },
    { type: 'TRANSFER' as unknown as 'EXPENSE' },
    { type: null as unknown as 'EXPENSE' },
    { frequency: 'FORTNIGHTLY' as unknown as 'MONTHLY' },
    { frequency: null as unknown as 'MONTHLY' },
    { day_of_month: null as unknown as number },
    { day_of_month: '25' as unknown as number },
    { day_of_month: 25.5 },
    { frequency: 'WEEKLY' as const, day_of_week: null as unknown as number },
    { frequency: 'YEARLY' as const, month_of_year: null as unknown as number },
    { is_active: null as unknown as boolean },
    { is_active: 'false' as unknown as boolean },
  ])('rejects invalid explicit update %p before linked-account lookup, encryption, or update', async (invalid) => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      ...invalid,
      account_id: '3',
    })).rejects.toBeInstanceOf(Error);

    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    0, 2, Number.MAX_SAFE_INTEGER + 1, BigInt(2), false, true, [], {}, '0', '00',
    '01', '+1', '-1', ' 1', '1 ', '1.0', '1e3', '0x1', '１２',
    '9223372036854775808', '12345678901234567890', 'private-account',
  ])('rejects invalid update account ID %p after owner lookup and before side effects', async (accountId) => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      account_id: accountId as unknown as string,
    })).rejects.toThrow('Invalid account ID');

    expect(recurringTransaction.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
    });
    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });

  it('returns missing before validating an invalid update account ID', async () => {
    recurringTransaction.findFirst.mockResolvedValue(null);

    await expect(updateRecurring(BigInt(7), BigInt(99), {
      account_id: true as unknown as string,
    })).resolves.toBe(false);

    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });

  it.each(['', null])('updates a finite amount and leap date while clearing end date %p', async (endDate) => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      amount: 0.25,
      start_date: '2028-02-29',
      end_date: endDate as unknown as string,
    })).resolves.toBe(true);

    expect(mockEncryptNumber).toHaveBeenCalledWith(0.25);
    expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
      data: expect.objectContaining({
        amount: 'enc:0.25',
        start_date: new Date('2028-02-29T00:00:00.000Z'),
        end_date: null,
      }),
    });
  });

  it.each([
    { frequency: 'WEEKLY' as const, day_of_week: 6 },
    { frequency: 'MONTHLY' as const, day_of_month: 31 },
    { frequency: 'YEARLY' as const, day_of_month: 31, month_of_year: 12 },
  ])('accepts a valid transition to $frequency', async (cadence) => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateRecurring(BigInt(7), BigInt(5), cadence)).resolves.toBe(true);
    expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
      data: expect.objectContaining(cadence),
    });
  });

  it.each([null, ''])('clears an explicit update account ID %p', async (accountId) => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      account_id: accountId as unknown as string,
    })).resolves.toBe(true);

    expect(financialAccount.findFirst).not.toHaveBeenCalled();
    expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
      data: { account_id: null },
    });
  });

  it.each(['1', '9223372036854775807'])(
    'links canonical update account ID %s',
    async (accountId) => {
      const parsed = BigInt(accountId);
      recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
      financialAccount.findFirst.mockResolvedValue({ id: parsed });
      recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

      await expect(updateRecurring(BigInt(7), BigInt(5), {
        account_id: accountId,
      })).resolves.toBe(true);

      expect(financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: parsed, user_id: BigInt(7), is_archived: false },
        select: { id: true },
      });
      expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), user_id: BigInt(7) },
        data: { account_id: parsed },
      });
    },
  );

  it('rejects an update account that is not active and owned by the user', async () => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    financialAccount.findFirst.mockResolvedValue(null);

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      account_id: '9',
    })).rejects.toThrow('Account not found');

    expect(financialAccount.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(9), user_id: BigInt(7), is_archived: false },
      select: { id: true },
    });
    expect(recurringTransaction.updateMany).not.toHaveBeenCalled();
  });

  it('omits an unchanged account ID from update data', async () => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      is_active: false,
    })).resolves.toBe(true);

    expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
      data: { is_active: false },
    });
  });

  it('preserves omitted cadence and allows clearing irrelevant cadence on a daily transition', async () => {
    recurringTransaction.findFirst.mockResolvedValue(monthlyRule);
    recurringTransaction.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateRecurring(BigInt(7), BigInt(5), {
      frequency: 'DAILY',
      day_of_month: null as unknown as number,
      is_active: false,
    })).resolves.toBe(true);

    expect(recurringTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(5), user_id: BigInt(7) },
      data: expect.objectContaining({
        frequency: 'DAILY',
        day_of_month: null,
        is_active: false,
      }),
    });
  });
});
