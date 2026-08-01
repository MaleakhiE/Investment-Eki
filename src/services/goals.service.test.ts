const financialGoal = {
  create: jest.fn(),
  findFirst: jest.fn(),
  updateMany: jest.fn(),
  update: jest.fn(),
};
const encryptNumber = jest.fn((value: number) => `encrypted:${value}`);
const decryptNumber = jest.fn((value: string) => Number(value.replace('encrypted:', '')));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { financialGoal },
}));
jest.mock('@/lib/encryption', () => ({ encryptNumber, decryptNumber }));

import { addToGoal, createGoal, InvalidGoalAmountError, updateGoal } from './goals.service';
import { FinancialInputError, MAX_FINANCIAL_AMOUNT } from '@/lib/financial-input';

const userId = BigInt(20);
const goalId = BigInt(30);

function goal(current: number, target = 1_000, isCompleted = false) {
  return {
    id: goalId,
    user_id: userId,
    name: 'Emergency fund',
    target_amount: `encrypted:${target}`,
    current_amount: `encrypted:${current}`,
    deadline: null,
    category: 'EMERGENCY_FUND',
    priority: 1,
    is_completed: isCompleted,
    created_at: new Date('2026-07-01T00:00:00.000Z'),
    updated_at: new Date('2026-07-01T00:00:00.000Z'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('addToGoal atomic encrypted addition', () => {
  it('retries a compare miss from fresh encrypted state without losing the concurrent contribution', async () => {
    financialGoal.findFirst
      .mockResolvedValueOnce(goal(100))
      .mockResolvedValueOnce({ ...goal(150), name: 'Renamed goal' });
    financialGoal.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(addToGoal(userId, goalId, 25)).resolves.toEqual(
      expect.objectContaining({ current_amount: 175, is_completed: false }),
    );

    expect(financialGoal.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: goalId,
        user_id: userId,
        current_amount: 'encrypted:100',
        target_amount: 'encrypted:1000',
        name: 'Emergency fund',
        deadline: null,
        category: 'EMERGENCY_FUND',
        priority: 1,
        is_completed: false,
      },
      data: { current_amount: 'encrypted:125', is_completed: false },
    });
    expect(financialGoal.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: goalId,
        user_id: userId,
        current_amount: 'encrypted:150',
        target_amount: 'encrypted:1000',
        name: 'Renamed goal',
        deadline: null,
        category: 'EMERGENCY_FUND',
        priority: 1,
        is_completed: false,
      },
      data: { current_amount: 'encrypted:175', is_completed: false },
    });
    expect(financialGoal.update).not.toHaveBeenCalled();
  });

  it('retries a P2034 conflict from fresh state', async () => {
    const conflict = Object.assign(new Error('Write conflict'), { code: 'P2034' });
    financialGoal.findFirst
      .mockResolvedValueOnce(goal(100))
      .mockResolvedValueOnce(goal(150));
    financialGoal.updateMany
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({ count: 1 });

    await expect(addToGoal(userId, goalId, 25)).resolves.toEqual(
      expect.objectContaining({ current_amount: 175 }),
    );
    expect(financialGoal.findFirst).toHaveBeenCalledTimes(2);
  });

  it('rethrows P2034 after the third attempt', async () => {
    const conflict = Object.assign(new Error('Write conflict'), { code: 'P2034' });
    financialGoal.findFirst.mockResolvedValue(goal(100));
    financialGoal.updateMany.mockRejectedValue(conflict);

    await expect(addToGoal(userId, goalId, 25)).rejects.toBe(conflict);
    expect(financialGoal.findFirst).toHaveBeenCalledTimes(3);
    expect(financialGoal.updateMany).toHaveBeenCalledTimes(3);
  });

  it.each([
    [99, 1, false],
    [99, 901, true],
    [99, 1_001, true],
  ])(
    'preserves completion semantics for current %d plus %d',
    async (current, amount, isCompleted) => {
      financialGoal.findFirst.mockResolvedValueOnce(goal(current));
      financialGoal.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(addToGoal(userId, goalId, amount)).resolves.toEqual(
        expect.objectContaining({
          current_amount: current + amount,
          is_completed: isCompleted,
        }),
      );
    },
  );

  it('returns null for a missing or foreign goal without encrypting or writing', async () => {
    financialGoal.findFirst.mockResolvedValueOnce(null);

    await expect(addToGoal(userId, goalId, 25)).resolves.toBeNull();

    expect(financialGoal.findFirst).toHaveBeenCalledWith({
      where: { id: goalId, user_id: userId },
    });
    expect(encryptNumber).not.toHaveBeenCalled();
    expect(financialGoal.updateMany).not.toHaveBeenCalled();
  });

  it('stops after three compare misses', async () => {
    financialGoal.findFirst.mockResolvedValue(goal(100));
    financialGoal.updateMany.mockResolvedValue({ count: 0 });

    await expect(addToGoal(userId, goalId, 25)).rejects.toThrow(
      'Goal addition conflict',
    );

    expect(financialGoal.findFirst).toHaveBeenCalledTimes(3);
    expect(financialGoal.updateMany).toHaveBeenCalledTimes(3);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects unsafe amount %s before reading financial state',
    async (amount) => {
      await expect(addToGoal(userId, goalId, amount)).rejects.toBeInstanceOf(
        InvalidGoalAmountError,
      );
      expect(financialGoal.findFirst).not.toHaveBeenCalled();
    },
  );

  it('rejects an amount above the policy maximum before reading financial state', async () => {
    await expect(
      addToGoal(userId, goalId, Number.MAX_VALUE),
    ).rejects.toBeInstanceOf(InvalidGoalAmountError);

    expect(financialGoal.findFirst).not.toHaveBeenCalled();
    expect(encryptNumber).not.toHaveBeenCalled();
    expect(financialGoal.updateMany).not.toHaveBeenCalled();
  });

  it('fails closed when stored financial state is non-finite', async () => {
    financialGoal.findFirst.mockResolvedValueOnce(goal(Number.MAX_VALUE));

    await expect(addToGoal(userId, goalId, 25)).rejects.toThrow(
      'Stored goal amount is invalid',
    );
    expect(encryptNumber).not.toHaveBeenCalled();
    expect(financialGoal.updateMany).not.toHaveBeenCalled();
  });

  it('propagates database failures without retrying', async () => {
    financialGoal.findFirst.mockResolvedValueOnce(goal(100));
    financialGoal.updateMany.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(addToGoal(userId, goalId, 25)).rejects.toThrow('database unavailable');
    expect(financialGoal.findFirst).toHaveBeenCalledTimes(1);
    expect(financialGoal.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects negative addition amount before reading financial state', async () => {
    await expect(addToGoal(userId, goalId, -10)).rejects.toBeInstanceOf(InvalidGoalAmountError);
    expect(financialGoal.findFirst).not.toHaveBeenCalled();
  });

  it('rejects addition that exceeds the per-transaction maximum before reading financial state', async () => {
    await expect(addToGoal(userId, goalId, MAX_FINANCIAL_AMOUNT + 1)).rejects.toBeInstanceOf(InvalidGoalAmountError);
    expect(financialGoal.findFirst).not.toHaveBeenCalled();
  });
});

describe('updateGoal input integrity', () => {
  it('uses the same integer priority boundary on create', async () => {
    await expect(createGoal(userId, {
      name: 'Emergency fund',
      target_amount: 1_000,
      category: 'EMERGENCY_FUND',
      priority: 1.5,
    })).rejects.toThrow('Priority must be between 1 and 5');
    expect(financialGoal.create).not.toHaveBeenCalled();
  });

  it.each([
    ['empty name', { name: '   ' }, 'Goal name is required and must be at most 100 characters'],
    ['non-string name', { name: 42 }, 'Goal name is required and must be at most 100 characters'],
    ['invalid deadline', { deadline: '2026-02-30' }, 'Invalid deadline format. Use YYYY-MM-DD'],
    ['non-string deadline', { deadline: 42 }, 'Invalid deadline format. Use YYYY-MM-DD'],
    ['invalid category', { category: 'UNKNOWN' }, 'Invalid goal category'],
    ['fractional priority', { priority: 1.5 }, 'Priority must be an integer between 1 and 5'],
    ['out-of-range priority', { priority: 6 }, 'Priority must be an integer between 1 and 5'],
    ['non-number priority', { priority: '1' }, 'Priority must be an integer between 1 and 5'],
    ['non-boolean completion flag', { is_completed: 'false' }, 'is_completed must be a boolean'],
    ['numeric completion flag', { is_completed: 1 }, 'is_completed must be a boolean'],
  ])('rejects %s before reading or writing', async (_case, input, message) => {
    await expect(updateGoal(userId, goalId, input as never)).rejects.toEqual(new FinancialInputError(message));
    expect(financialGoal.updateMany).not.toHaveBeenCalled();
    expect(financialGoal.findFirst).not.toHaveBeenCalled();
  });

  it('clears a deadline explicitly and trims a valid name', async () => {
    financialGoal.updateMany.mockResolvedValueOnce({ count: 1 });
    financialGoal.findFirst.mockResolvedValueOnce(goal(100));

    await updateGoal(userId, goalId, { name: ' Updated ', deadline: null });

    expect(financialGoal.updateMany).toHaveBeenCalledWith({
      where: { id: goalId, user_id: userId },
      data: { name: 'Updated', deadline: null },
    });
  });

  it('accepts an explicit boolean completion flag', async () => {
    financialGoal.updateMany.mockResolvedValueOnce({ count: 1 });
    financialGoal.findFirst.mockResolvedValueOnce(goal(100));

    await updateGoal(userId, goalId, { is_completed: false });

    expect(financialGoal.updateMany).toHaveBeenCalledWith({
      where: { id: goalId, user_id: userId },
      data: { is_completed: false },
    });
  });
});
