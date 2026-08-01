jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/analytics.service', () => ({ getCashflowTrend: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { getCashflowTrend } from '@/services/analytics.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps cashflow trend failures private', async () => {
  jest.mocked(getCashflowTrend).mockRejectedValue(new Error('private trend balances'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500);
  expect(log).toHaveBeenCalledWith('Error getting cashflow trend:', { code: 'UNCLASSIFIED' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private trend balances');
  log.mockRestore();
});
