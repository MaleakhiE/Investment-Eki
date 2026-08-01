jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/settings.service', () => ({ updateAIRecommendationSetting: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { updateAIRecommendationSetting } from '@/services/settings.service';
import { PATCH } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps AI setting failures private while preserving a safe code', async () => {
  jest.mocked(updateAIRecommendationSetting).mockRejectedValue({ code: 'P2002', message: 'private preference details' }); const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await PATCH(new Request('http://localhost/api/settings/ai-recommendation', { method: 'PATCH', body: JSON.stringify({ enabled: true }) }) as never);
  expect(response.status).toBe(500); expect(log).toHaveBeenCalledWith('Error updating AI recommendation setting:', { code: 'P2002' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private preference details'); log.mockRestore();
});
