jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ prisma: { investment: { findMany: jest.fn() } } }));

import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedFindMany = jest.mocked(prisma.investment.findMany);

beforeEach(() => { jest.clearAllMocks(); mockedUserId.mockResolvedValue(BigInt(7)); });

it('keeps investment list failures private while preserving an allowlisted code', async () => {
  mockedFindMany.mockRejectedValue({ code: 'P1001', message: 'private portfolio SQL details' });
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const response = await GET();

  expect(response.status).toBe(500);
  expect(errorLog).toHaveBeenCalledWith('Error getting investments:', { code: 'P1001' });
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private portfolio SQL details');
  errorLog.mockRestore();
});
