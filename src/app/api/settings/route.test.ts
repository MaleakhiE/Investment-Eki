jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/settings.service', () => ({ getUserSettings: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { getUserSettings } from '@/services/settings.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps settings failures private', async () => {
  jest.mocked(getUserSettings).mockRejectedValue(new Error('private user settings')); const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500); expect(log).toHaveBeenCalledWith('Error getting settings:', { code: 'UNCLASSIFIED' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private user settings'); log.mockRestore();
});
