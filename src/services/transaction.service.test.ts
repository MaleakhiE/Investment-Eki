const transactionRepository = {
  create: jest.fn(),
  findFirst: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  prisma: { transaction: transactionRepository },
}));

jest.mock('@/lib/encryption', () => ({
  encryptNumber: (value: number) => `encrypted:${value}`,
  decryptNumber: (value: string) => Number(value.replace('encrypted:', '')),
}));

import {
  ACCOUNT_PRESETS,
  createTransaction,
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
    transactionRepository.create.mockResolvedValue(persisted);

    const result = await createTransaction(BigInt(20), {
      ...baseInput,
      account: '  BCA  ',
      receipt_image: persisted.receipt_image,
    });

    expect(transactionRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ account: 'BCA', receipt_image: persisted.receipt_image }),
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
import fc from 'fast-check';
