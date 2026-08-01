jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/settings.service', () => ({ isAIRecommendationEnabled: jest.fn() }));
jest.mock('@/services/recommendation.service', () => ({ getInvestmentRecommendation: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { isAIRecommendationEnabled } from '@/services/settings.service';
import { getInvestmentRecommendation } from '@/services/recommendation.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); jest.mocked(isAIRecommendationEnabled).mockResolvedValue(true); });
it('keeps recommendation failures private while preserving a safe code', async () => {
  jest.mocked(getInvestmentRecommendation).mockRejectedValue({ code: 'P2034', message: 'private recommendation values' });
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500);
  expect(log).toHaveBeenCalledWith('Error getting investment recommendation:', { code: 'P2034' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private recommendation values');
  log.mockRestore();
});
