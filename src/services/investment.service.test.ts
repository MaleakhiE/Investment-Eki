const rootInvestmentRepository = {
  findUnique: jest.fn(),
  create: jest.fn(),
};
const rootSnapshotRepository = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};
const transactionInvestmentRepository = {
  findUnique: jest.fn(),
  create: jest.fn(),
};
const transactionSnapshotRepository = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};
const transactionClient = {
  investment: transactionInvestmentRepository,
  investmentSnapshot: transactionSnapshotRepository,
  transaction: { create: jest.fn() },
  financialAccount: { findFirst: jest.fn() },
};
const databaseTransaction = jest.fn(
  async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient),
);
const createTransaction = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    investment: rootInvestmentRepository,
    investmentSnapshot: rootSnapshotRepository,
    $transaction: databaseTransaction,
  },
}));

jest.mock('@/lib/encryption', () => ({
  encryptNumber: (value: number) => `encrypted:${value}`,
  decryptNumber: (value: string) => Number(value.replace('encrypted:', '')),
}));

jest.mock('./transaction.service', () => ({
  createTransaction,
}));

import { saveSnapshot } from './investment.service';

const userId = BigInt(20);
const investment = {
  id: BigInt(30),
  user_id: userId,
  type: 'MUTUAL_FUND',
  created_at: new Date('2026-07-01T00:00:00.000Z'),
};
const persistedSnapshot = {
  id: BigInt(40),
  investment_id: investment.id,
  month: '2026-07',
  invested_amount: 'encrypted:650000',
  current_value: 'encrypted:700000',
  platform: 'Bibit',
  product_name: 'Index Fund',
  units: null,
  nav_per_unit: null,
  created_at: new Date('2026-07-24T00:00:00.000Z'),
};
const input = {
  type: 'MUTUAL_FUND' as const,
  month: '2026-07',
  invested_amount: 650_000,
  current_value: 700_000,
  platform: 'Bibit',
  product_name: 'Index Fund',
};

function arrangeExistingSnapshot() {
  const previousSnapshot = {
    ...persistedSnapshot,
    invested_amount: 'encrypted:400000',
    current_value: 'encrypted:425000',
  };

  rootInvestmentRepository.findUnique.mockResolvedValue(investment);
  rootSnapshotRepository.findUnique.mockResolvedValue(previousSnapshot);
  rootSnapshotRepository.upsert.mockResolvedValue(persistedSnapshot);
  transactionInvestmentRepository.findUnique.mockResolvedValue(investment);
  transactionSnapshotRepository.findUnique.mockResolvedValue(previousSnapshot);
  transactionSnapshotRepository.upsert.mockResolvedValue(persistedSnapshot);
  createTransaction.mockResolvedValue({ success: true, transaction: { id: BigInt(50) } });
}

beforeEach(() => {
  jest.clearAllMocks();
  databaseTransaction.mockImplementation(
    async (callback: (client: typeof transactionClient) => unknown) => callback(transactionClient),
  );
  arrangeExistingSnapshot();
});

describe('saveSnapshot atomic investment accounting', () => {
  it('uses one serializable transaction and the callback client for every write', async () => {
    rootInvestmentRepository.findUnique.mockResolvedValue(null);
    rootInvestmentRepository.create.mockResolvedValue(investment);
    transactionInvestmentRepository.findUnique.mockResolvedValue(null);
    transactionInvestmentRepository.create.mockResolvedValue(investment);

    await expect(saveSnapshot(userId, input)).resolves.toEqual(
      expect.objectContaining({ success: true, transactionCreated: true }),
    );

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(databaseTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    );
    expect(transactionInvestmentRepository.create).toHaveBeenCalledWith({
      data: { user_id: userId, type: 'MUTUAL_FUND' },
    });
    expect(transactionSnapshotRepository.upsert).toHaveBeenCalledTimes(1);
    expect(createTransaction).toHaveBeenCalledWith(
      userId,
      expect.any(Object),
      transactionClient,
    );
    expect(rootInvestmentRepository.create).not.toHaveBeenCalled();
    expect(rootSnapshotRepository.upsert).not.toHaveBeenCalled();
  });

  it('creates an expense for only the positive invested-amount delta', async () => {
    const result = await saveSnapshot(userId, input);

    expect(createTransaction).toHaveBeenCalledWith(
      userId,
      {
        date: '2026-07-01',
        type: 'EXPENSE',
        category: 'Investment',
        description: 'Bibit - Index Fund',
        amount: 250_000,
      },
      transactionClient,
    );
    expect(result).toEqual(expect.objectContaining({
      success: true,
      isNewSnapshot: false,
      transactionCreated: true,
    }));
  });

  it('rejects so the snapshot rolls back when generated transaction creation fails', async () => {
    createTransaction.mockResolvedValue({
      success: false,
      error: 'Generated investment expense could not be saved',
    });

    await expect(saveSnapshot(userId, input)).rejects.toThrow(
      'Generated investment expense could not be saved',
    );
    expect(databaseTransaction).toHaveBeenCalledTimes(1);
  });

  it('skips the generated expense when createTransaction is false', async () => {
    const result = await saveSnapshot(userId, { ...input, createTransaction: false });

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(transactionSnapshotRepository.upsert).toHaveBeenCalledTimes(1);
    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      success: true,
      transactionCreated: false,
    }));
  });

  it('skips the generated expense when invested amount is unchanged', async () => {
    const result = await saveSnapshot(userId, {
      ...input,
      invested_amount: 400_000,
    });

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(transactionSnapshotRepository.upsert).toHaveBeenCalledTimes(1);
    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      success: true,
      isNewSnapshot: false,
      transactionCreated: false,
    }));
  });

  it('skips the generated expense when invested amount decreases', async () => {
    const result = await saveSnapshot(userId, {
      ...input,
      invested_amount: 300_000,
    });

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(transactionSnapshotRepository.upsert).toHaveBeenCalledTimes(1);
    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      success: true,
      isNewSnapshot: false,
      transactionCreated: false,
    }));
  });

  it('retries P2034 conflicts and returns the successful third attempt', async () => {
    const conflict = Object.assign(new Error('Write conflict'), { code: 'P2034' });
    let attempt = 0;
    databaseTransaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) => {
        attempt += 1;
        if (attempt < 3) throw conflict;
        return callback(transactionClient);
      },
    );

    await expect(saveSnapshot(userId, input)).resolves.toEqual(
      expect.objectContaining({ success: true, transactionCreated: true }),
    );
    expect(databaseTransaction).toHaveBeenCalledTimes(3);
    expect(transactionSnapshotRepository.upsert).toHaveBeenCalledTimes(1);
  });
});
