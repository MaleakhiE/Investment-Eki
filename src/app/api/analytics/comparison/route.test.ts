jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/analytics.service', () => ({ getInvestmentComparison: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { getInvestmentComparison } from '@/services/analytics.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps comparison failures private', async () => {
  jest.mocked(getInvestmentComparison).mockRejectedValue(new Error('private comparison portfolio values'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500);
  expect(log).toHaveBeenCalledWith('Error getting investment comparison:', { code: 'UNCLASSIFIED' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private comparison portfolio values');
  log.mockRestore();
});
