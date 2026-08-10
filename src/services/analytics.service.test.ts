jest.mock('@/lib/prisma', () => ({
  prisma: { monthlyCashflow: { findMany: jest.fn() } },
}));
jest.mock('@/lib/encryption', () => ({
  decryptNumber: jest.fn((value: string) => Number(value.replace('encrypted:', ''))),
}));

import { prisma } from '@/lib/prisma';
import { getCashflowTrend } from './analytics.service';

it('returns decrypted income, total expense, and net cashflow for the chart contract', async () => {
  jest.mocked(prisma.monthlyCashflow.findMany).mockResolvedValue([
    {
      month: '2026-08',
      income: 'encrypted:12000000',
      total_expense: 'encrypted:4500000',
      net_cashflow: 'encrypted:7500000',
    },
  ] as never);

  await expect(getCashflowTrend(BigInt(7))).resolves.toEqual([
    { month: '2026-08', income: 12000000, expense: 4500000, net_cashflow: 7500000 },
  ]);
});
