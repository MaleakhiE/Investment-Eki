const transactionRepository = {
  create: jest.fn(),
  findFirst: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  delete: jest.fn(),
};
const financialAccountRepository = { findMany: jest.fn(), findFirst: jest.fn() };
const databaseTransaction = jest.fn(async (callback: (client: unknown) => unknown) => callback({
  transaction: transactionRepository,
  financialAccount: financialAccountRepository,
}));
const mockEncryptNumber = jest.fn((value: number) => `encrypted:${value}`);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: transactionRepository,
    financialAccount: financialAccountRepository,
    $transaction: databaseTransaction,
  },
}));

jest.mock('@/lib/encryption', () => ({
  encryptNumber: mockEncryptNumber,
  decryptNumber: (value: string) => Number(value.replace('encrypted:', '')),
}));

import {
  ACCOUNT_PRESETS,
  createTransfer,
  createTransaction,
  getMonthlySummary,
  getTransactions,
  updateTransaction,
  validateTransactionInput,
} from './transaction.service';

const baseInput = {
  date: '2026-07-11',
  type: 'EXPENSE' as const,
  category: 'Food',
  description: 'Lunch',
  amount: 50_000,
};

const persisted = {
  id: BigInt(10),
  user_id: BigInt(20),
  date: new Date('2026-07-11T00:00:00.000Z'),
  type: 'EXPENSE',
  category: 'Food',
  description: 'Lunch',
  amount: 'encrypted:50000',
  account: 'BCA',
  receipt_image: 'data:image/jpeg;base64,/9j/AA==',
  created_at: new Date('2026-07-11T01:00:00.000Z'),
  updated_at: new Date('2026-07-11T01:00:00.000Z'),
};

beforeEach(() => jest.clearAllMocks());

describe('strict financial write validation', () => {
  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '0000-01-01',
    '0999-12-31',
    '2026-2-01',
    ' 2026-07-11',
  ])('rejects non-calendar or noncanonical date %s', (date) => {
    expect(validateTransactionInput({ ...baseInput, date })).toEqual({
      valid: false,
      errors: ['Invalid date format. Use YYYY-MM-DD'],
    });
  });

  it.each(['1000-01-01', '2028-02-29', '2026-04-30', '9999-12-31'])(
    'accepts real calendar date %s',
    (date) => {
      expect(validateTransactionInput({ ...baseInput, date })).toEqual({ valid: true, errors: [] });
    },
  );

  it.each([NaN, Infinity, -Infinity, 0, -1, null, '50000'])(
    'rejects invalid amount %p',
    (amount) => {
      expect(validateTransactionInput({
        ...baseInput,
        amount: amount as number,
      })).toEqual({ valid: false, errors: ['Amount must be a positive number'] });
    },
  );

  it('accepts a finite positive fraction without changing it', () => {
    expect(validateTransactionInput({ ...baseInput, amount: 0.25 }))
      .toEqual({ valid: true, errors: [] });
  });

  it.each([
    { date: '2026-02-29', amount: 50_000 },
    { date: '2026-07-11', amount: Infinity },
  ])('rejects create input before encryption, account lookup, or persistence', async (invalid) => {
    await expect(createTransaction(BigInt(20), {
      ...baseInput,
      ...invalid,
      account_id: '2',
    })).resolves.toEqual(expect.objectContaining({ success: false }));

    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(financialAccountRepository.findFirst).not.toHaveBeenCalled();
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    { date: '2026-04-31', amount: 50_000 },
    { date: '2026-07-11', amount: NaN },
  ])('rejects update input before ownership lookup, encryption, or persistence', async (invalid) => {
    await expect(updateTransaction(BigInt(20), BigInt(10), {
      ...baseInput,
      ...invalid,
      account_id: '2',
    })).resolves.toEqual(expect.objectContaining({ success: false }));

    expect(transactionRepository.findFirst).not.toHaveBeenCalled();
    expect(mockEncryptNumber).not.toHaveBeenCalled();
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it('rejects an impossible transfer date before opening a database transaction', async () => {
    await expect(createTransfer(BigInt(20), {
      date: '2026-02-29',
      source_account_id: '1',
      destination_account_id: '2',
      amount: 50_000,
      description: 'Move funds',
    })).resolves.toEqual({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });

    expect(databaseTransaction).not.toHaveBeenCalled();
    expect(mockEncryptNumber).not.toHaveBeenCalled();
  });

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite transfer amount %p before opening a database transaction',
    async (amount) => {
      await expect(createTransfer(BigInt(20), {
        date: '2026-07-11',
        source_account_id: '1',
        destination_account_id: '2',
        amount,
        description: 'Move funds',
      })).resolves.toEqual({ success: false, error: 'Amount must be a positive number' });

      expect(databaseTransaction).not.toHaveBeenCalled();
      expect(mockEncryptNumber).not.toHaveBeenCalled();
    },
  );
});

describe('transaction account validation', () => {
  it('exposes the supported account presets in product order', () => {
    expect(ACCOUNT_PRESETS).toEqual([
      'Cash', 'BCA', 'Mandiri', 'BRI', 'BNI', 'GoPay', 'OVO', 'Dana', 'Credit Card',
    ]);
  });

  it('accepts an account with exactly 100 trimmed characters', () => {
    expect(validateTransactionInput({ ...baseInput, account: ` ${'a'.repeat(100)} ` })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects an account longer than 100 trimmed characters', () => {
    expect(validateTransactionInput({ ...baseInput, account: 'a'.repeat(101) })).toEqual({
      valid: false,
      errors: ['Account must be at most 100 characters'],
    });
  });

  it('accepts exactly the trimmed account values within the 100-character boundary', () => {
    fc.assert(fc.property(fc.string({ maxLength: 140 }), (account) => {
      const result = validateTransactionInput({ ...baseInput, account });
      expect(result.valid).toBe(account.trim().length <= 100);
    }), { numRuns: 150 });
  });

  it('rejects receipt content that is not a supported image data URL', () => {
    const result = validateTransactionInput({ ...baseInput, receipt_image: 'not-an-image' });
    expect(result).toEqual({ valid: false, errors: ['Receipt image must be a valid JPEG, PNG, or WebP data URL up to 5 MiB'] });
  });

  it('rejects receipt data larger than 5 MiB', () => {
    const oversized = `data:image/jpeg;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}`;
    expect(validateTransactionInput({ ...baseInput, receipt_image: oversized }).valid).toBe(false);
  });
});

describe('transaction optional field round trips', () => {
  it('normalizes account and persists account and receipt image on create', async () => {
    transactionRepository.create.mockResolvedValue({
      ...persisted,
      date: new Date('2028-02-29T00:00:00.000Z'),
    });

    const result = await createTransaction(BigInt(20), {
      ...baseInput,
      date: '2028-02-29',
      account: '  BCA  ',
      receipt_image: persisted.receipt_image,
    });

    expect(transactionRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        date: new Date('2028-02-29T00:00:00.000Z'),
        account: 'BCA',
        receipt_image: persisted.receipt_image,
      }),
    });
    expect(result.transaction).toEqual(expect.objectContaining({
      account: 'BCA',
      receipt_image: persisted.receipt_image,
    }));
  });

  it('normalizes an empty account to null on update', async () => {
    transactionRepository.findFirst.mockResolvedValue(persisted);
    transactionRepository.update.mockResolvedValue({ ...persisted, account: null, receipt_image: null });

    const result = await updateTransaction(BigInt(20), BigInt(10), {
      ...baseInput,
      account: '   ',
      receipt_image: null,
    });

    expect(transactionRepository.update).toHaveBeenCalledWith({
      where: { id: BigInt(10) },
      data: expect.objectContaining({ account: null, receipt_image: null }),
    });
    expect(result.transaction).toEqual(expect.objectContaining({ account: null, receipt_image: null }));
  });

  it('returns receipt presence without embedding the image in transaction lists', async () => {
    transactionRepository.findMany.mockResolvedValue([persisted]);

    const result = await getTransactions(BigInt(20));

    expect(result[0]).toEqual(expect.objectContaining({ account: 'BCA', receipt_image: null, has_receipt: true }));
  });
});

describe('linked account transactions', () => {
  it('rejects a transaction linked to an account the user does not own', async () => {
    financialAccountRepository.findFirst.mockResolvedValue(null);

    const result = await createTransaction(BigInt(20), {
      ...baseInput,
      account_id: '99',
    });

    expect(result).toEqual({ success: false, error: 'Account not found' });
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });

  it('persists the owned account id and compatibility name', async () => {
    financialAccountRepository.findFirst.mockResolvedValue({ id: BigInt(2), name: 'Mandiri' });
    transactionRepository.create.mockResolvedValue({
      ...persisted,
      account: 'Mandiri',
      account_id: BigInt(2),
      destination_account_id: null,
    });

    await createTransaction(BigInt(20), { ...baseInput, account_id: '2' });

    expect(transactionRepository.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      account_id: BigInt(2),
      account: 'Mandiri',
    }) });
  });

  it('uses an explicit transaction client for account lookup and transaction creation', async () => {
    const scopedFinancialAccountRepository = { findFirst: jest.fn() };
    const scopedTransactionRepository = { create: jest.fn() };
    const scopedClient = {
      financialAccount: scopedFinancialAccountRepository,
      transaction: scopedTransactionRepository,
    } as unknown as Parameters<typeof createTransaction>[2];

    scopedFinancialAccountRepository.findFirst.mockResolvedValue({
      id: BigInt(2),
      name: 'Mandiri',
    });
    scopedTransactionRepository.create.mockResolvedValue({
      ...persisted,
      account: 'Mandiri',
      account_id: BigInt(2),
      destination_account_id: null,
    });

    const result = await createTransaction(
      BigInt(20),
      { ...baseInput, account_id: '2' },
      scopedClient,
    );

    expect(scopedFinancialAccountRepository.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(2), user_id: BigInt(20), is_archived: false },
      select: { id: true, name: true },
    });
    expect(scopedTransactionRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: BigInt(20),
        account_id: BigInt(2),
        account: 'Mandiri',
      }),
    });
    expect(financialAccountRepository.findFirst).not.toHaveBeenCalled();
    expect(transactionRepository.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });
});

describe('account transfers', () => {
  it('rejects transfers to the same account', async () => {
    await expect(createTransfer(BigInt(20), {
      date: '2026-07-17',
      source_account_id: '1',
      destination_account_id: '1',
      amount: 50_000,
      description: 'Move funds',
    })).resolves.toEqual({ success: false, error: 'Source and destination accounts must be different' });
  });

  it('creates one atomic transfer between two owned active accounts', async () => {
    financialAccountRepository.findMany.mockResolvedValue([
      { id: BigInt(1), name: 'BCA' },
      { id: BigInt(2), name: 'Mandiri' },
    ]);
    transactionRepository.create.mockResolvedValue({
      ...persisted,
      type: 'TRANSFER',
      category: 'Transfer',
      account: 'BCA',
      account_id: BigInt(1),
      destination_account_id: BigInt(2),
    });

    const result = await createTransfer(BigInt(20), {
      date: '2026-07-17', source_account_id: '1', destination_account_id: '2',
      amount: 50_000, description: 'Move funds',
    });

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(transactionRepository.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'TRANSFER', account_id: BigInt(1), destination_account_id: BigInt(2),
      amount: 'encrypted:50000',
    }) });
    expect(result.success).toBe(true);
  });

  it('defaults a missing transfer description at the API boundary', async () => {
    financialAccountRepository.findMany.mockResolvedValue([
      { id: BigInt(1), name: 'BCA' },
      { id: BigInt(2), name: 'Mandiri' },
    ]);
    transactionRepository.create.mockResolvedValue({
      ...persisted, type: 'TRANSFER', category: 'Transfer', account: 'BCA',
      account_id: BigInt(1), destination_account_id: BigInt(2),
    });

    const result = await createTransfer(BigInt(20), {
      date: '2026-07-17', source_account_id: '1', destination_account_id: '2',
      amount: 50_000, description: undefined as unknown as string,
    });

    expect(result.success).toBe(true);
    expect(transactionRepository.create).toHaveBeenCalledWith({ data: expect.objectContaining({ description: 'Account transfer' }) });
  });

  it('excludes transfers from income and expense summaries', async () => {
    transactionRepository.findMany.mockResolvedValue([
      { type: 'INCOME', category: 'Salary', amount: 'encrypted:100000' },
      { type: 'EXPENSE', category: 'Food', amount: 'encrypted:20000' },
      { type: 'TRANSFER', category: 'Transfer', amount: 'encrypted:50000' },
    ]);

    await expect(getMonthlySummary(BigInt(20), '2026-07')).resolves.toEqual(expect.objectContaining({
      total_income: 100_000,
      total_expense: 20_000,
      net_cashflow: 80_000,
    }));
  });
});
import fc from 'fast-check';
