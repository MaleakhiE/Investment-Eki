const financialAccountRepository = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const transactionRepository = { findMany: jest.fn() };

jest.mock('@/lib/prisma', () => ({
  prisma: {
    financialAccount: financialAccountRepository,
    transaction: transactionRepository,
  },
}));

jest.mock('@/lib/encryption', () => ({
  encryptNumber: (value: number) => `encrypted:${value}`,
  decryptNumber: (value: string) => Number(value.replace('encrypted:', '')),
}));

import {
  calculateAccountBalance,
  createAccount,
  archiveAccount,
  getAccounts,
  updateAccount,
  validateAccountInput,
} from './account.service';

const userId = BigInt(20);
const now = new Date('2026-07-17T00:00:00.000Z');

beforeEach(() => jest.clearAllMocks());

describe('financial account validation', () => {
  it('normalizes a valid account', () => {
    expect(validateAccountInput({
      name: '  BCA  ',
      type: 'BANK',
      opening_balance: 1_000_000,
      color: '#16332f',
    })).toEqual({
      valid: true,
      errors: [],
      value: { name: 'BCA', type: 'BANK', opening_balance: 1_000_000, color: '#16332f' },
    });
  });

  it('rejects invalid names, types, balances, and colors', () => {
    const result = validateAccountInput({
      name: ' ',
      type: 'CARD' as 'BANK',
      opening_balance: -1,
      color: 'red',
    });

    expect(result.errors).toEqual([
      'Account name is required',
      'Account type must be BANK, WALLET, or CASH',
      'Opening balance cannot be negative',
      'Color must be a six-digit hex value',
    ]);
  });
});

describe('financial account balances', () => {
  it('adds income and incoming transfers and subtracts expenses and outgoing transfers', () => {
    const balance = calculateAccountBalance(BigInt(1), 100_000, [
      { type: 'INCOME', amount: 50_000, account_id: BigInt(1), destination_account_id: null },
      { type: 'EXPENSE', amount: 20_000, account_id: BigInt(1), destination_account_id: null },
      { type: 'TRANSFER', amount: 10_000, account_id: BigInt(1), destination_account_id: BigInt(2) },
      { type: 'TRANSFER', amount: 5_000, account_id: BigInt(2), destination_account_id: BigInt(1) },
    ]);

    expect(balance).toBe(125_000);
  });

  it('returns active accounts with encrypted values converted and calculated', async () => {
    financialAccountRepository.findMany.mockResolvedValue([{
      id: BigInt(1), user_id: userId, name: 'BCA', type: 'BANK',
      opening_balance: 'encrypted:100000', color: '#16332f', is_archived: false,
      created_at: now, updated_at: now,
    }]);
    transactionRepository.findMany.mockResolvedValue([{
      type: 'INCOME', amount: 'encrypted:50000', account_id: BigInt(1), destination_account_id: null,
    }]);

    await expect(getAccounts(userId)).resolves.toEqual([expect.objectContaining({
      id: BigInt(1), name: 'BCA', opening_balance: 100_000, balance: 150_000,
    })]);
    expect(financialAccountRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: userId, is_archived: false },
    }));
  });
});

describe('financial account creation', () => {
  it('rejects a duplicate active or archived account name for the same user', async () => {
    financialAccountRepository.findFirst.mockResolvedValue({ id: BigInt(1) });

    await expect(createAccount(userId, {
      name: 'BCA', type: 'BANK', opening_balance: 0,
    })).resolves.toEqual({ success: false, error: 'An account with this name already exists' });
  });

  it('encrypts the opening balance before persistence', async () => {
    financialAccountRepository.findFirst.mockResolvedValue(null);
    financialAccountRepository.create.mockResolvedValue({
      id: BigInt(2), user_id: userId, name: 'Mandiri', type: 'BANK',
      opening_balance: 'encrypted:250000', color: null, is_archived: false,
      created_at: now, updated_at: now,
    });

    const result = await createAccount(userId, {
      name: ' Mandiri ', type: 'BANK', opening_balance: 250_000,
    });

    expect(financialAccountRepository.create).toHaveBeenCalledWith({ data: {
      user_id: userId,
      name: 'Mandiri',
      type: 'BANK',
      opening_balance: 'encrypted:250000',
      color: null,
    } });
    expect(result).toEqual({ success: true, account: expect.objectContaining({ opening_balance: 250_000, balance: 250_000 }) });
  });
});

describe('financial account maintenance', () => {
  it('updates only an account owned by the user', async () => {
    financialAccountRepository.findFirst
      .mockResolvedValueOnce({ id: BigInt(2), user_id: userId })
      .mockResolvedValueOnce(null);
    financialAccountRepository.update.mockResolvedValue({
      id: BigInt(2), user_id: userId, name: 'Daily BCA', type: 'BANK',
      opening_balance: 'encrypted:500000', color: '#00d4aa', is_archived: false,
      created_at: now, updated_at: now,
    });

    const result = await updateAccount(userId, BigInt(2), {
      name: 'Daily BCA', type: 'BANK', opening_balance: 500_000, color: '#00d4aa',
    });

    expect(financialAccountRepository.update).toHaveBeenCalledWith({
      where: { id: BigInt(2) },
      data: expect.objectContaining({ name: 'Daily BCA', opening_balance: 'encrypted:500000' }),
    });
    expect(result.success).toBe(true);
  });

  it('archives rather than deleting an owned account', async () => {
    financialAccountRepository.findFirst.mockResolvedValue({ id: BigInt(2) });
    financialAccountRepository.update.mockResolvedValue({ id: BigInt(2), is_archived: true });

    await expect(archiveAccount(userId, BigInt(2))).resolves.toEqual({ success: true });
    expect(financialAccountRepository.update).toHaveBeenCalledWith({
      where: { id: BigInt(2) },
      data: { is_archived: true },
    });
  });

  it('does not archive an account owned by another user', async () => {
    financialAccountRepository.findFirst.mockResolvedValue(null);
    await expect(archiveAccount(userId, BigInt(99))).resolves.toEqual({ success: false, error: 'Account not found' });
  });
});
