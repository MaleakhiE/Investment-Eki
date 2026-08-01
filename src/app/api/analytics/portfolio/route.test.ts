jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/analytics.service', () => ({ getPortfolioSummary: jest.fn(), getPortfolioGrowth: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { getPortfolioSummary } from '@/services/analytics.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps portfolio failures private while preserving a safe code', async () => {
  jest.mocked(getPortfolioSummary).mockRejectedValue({ code: 'P1001', message: 'private portfolio values' });
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500);
  expect(log).toHaveBeenCalledWith('Error getting portfolio analytics:', { code: 'P1001' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private portfolio values');
  log.mockRestore();
});
