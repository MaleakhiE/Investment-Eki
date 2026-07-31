const transactionRepository = { findMany: jest.fn() };

jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { transaction: transactionRepository },
}));
jest.mock('@/lib/encryption', () => ({
  decryptNumber: (value: string) => Number(value.replace('encrypted:', '')),
}));

import { getCurrentUserId } from '@/lib/auth';
import { GET } from './route';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7));
});

it('groups prototype-reserved category names as exact numeric own properties', async () => {
  transactionRepository.findMany.mockResolvedValue([
    { type: 'EXPENSE', category: '__proto__', amount: 'encrypted:10' },
    { type: 'EXPENSE', category: '__proto__', amount: 'encrypted:5' },
    { type: 'EXPENSE', category: 'constructor', amount: 'encrypted:20' },
    { type: 'EXPENSE', category: 'toString', amount: 'encrypted:30' },
    { type: 'EXPENSE', category: 'Food', amount: 'encrypted:40' },
  ]);

  const response = await GET(new Request(
    'https://fintrack.example/api/transactions/summary-range?startDate=2026-07-01&endDate=2026-07-31',
  ) as never);
  const body = await response.json();
  const categories = body.responseDetails.expense_by_category;
  const expected = Object.fromEntries([
    ['__proto__', 15],
    ['constructor', 20],
    ['toString', 30],
    ['Food', 40],
  ]);

  expect(response.status).toBe(200);
  expect(body.responseDetails.total_expense).toBe(105);
  expect(categories).toEqual(expected);
  for (const category of Object.keys(expected)) {
    expect(Object.hasOwn(categories, category)).toBe(true);
  }
});

describe('summary-range date validation', () => {
  it('rejects impossible calendar dates such as 2026-02-30', async () => {
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions/summary-range?startDate=2026-02-30&endDate=2026-03-31',
    ) as never);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.responseStatus).toBe('ERROR');
    expect(transactionRepository.findMany).not.toHaveBeenCalled();
  });

  it('rejects reversed ranges where startDate is after endDate', async () => {
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions/summary-range?startDate=2026-08-01&endDate=2026-07-01',
    ) as never);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.responseStatus).toBe('ERROR');
    expect(transactionRepository.findMany).not.toHaveBeenCalled();
  });

  it('queries the repository with parsed UTC-midnight bounds for a valid range', async () => {
    transactionRepository.findMany.mockResolvedValue([]);
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions/summary-range?startDate=2026-07-01&endDate=2026-07-31',
    ) as never);
    expect(response.status).toBe(200);
    expect(transactionRepository.findMany).toHaveBeenCalledTimes(1);
    const args = transactionRepository.findMany.mock.calls[0][0] as {
      where: { date: { gte: Date; lte: Date } };
    };
    expect(args.where.date.gte.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(args.where.date.lte.toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });
});
