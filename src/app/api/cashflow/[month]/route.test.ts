jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/cashflow.service', () => ({ getCashflowByMonth: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { getCashflowByMonth } from '@/services/cashflow.service';
import { GET } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedGet = jest.mocked(getCashflowByMonth);
const params = (month: string) => ({ params: Promise.resolve({ month }) });

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserId.mockResolvedValue(BigInt(7));
});

it('keeps month cashflow failures private while preserving a safe code', async () => {
  mockedGet.mockRejectedValue({ code: 'P1001', message: 'private month cashflow details' });
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const response = await GET(new Request('http://localhost/api/cashflow/2026-07') as never, params('2026-07'));

  expect(response.status).toBe(500);
  expect(errorLog).toHaveBeenCalledWith('Error getting cashflow:', { code: 'P1001' });
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private month cashflow details');
  errorLog.mockRestore();
});
