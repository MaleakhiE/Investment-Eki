jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/savings-suggestion.service', () => ({
  getSavingsSuggestions: jest.fn(),
}));
import { getCurrentUserId } from '@/lib/auth';
import { getSavingsSuggestions } from '@/services/savings-suggestion.service';
import { GET } from './route';
const mockedGetCurrentUserId = jest.mocked(getCurrentUserId);
const mockedGetSavingsSuggestions = jest.mocked(getSavingsSuggestions);

describe('GET /api/analytics/savings-suggestions', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('returns the standard unauthorized envelope', async () => {
    mockedGetCurrentUserId.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      responseCode: 401, responseStatus: 'ERROR', responseMessage: 'Unauthorized', responseDetails: null,
    });
    expect(mockedGetSavingsSuggestions).not.toHaveBeenCalled();
  });

  it('returns authenticated suggestions in the standard success envelope', async () => {
    mockedGetCurrentUserId.mockResolvedValue(BigInt(7));
    const suggestions = [{ category: 'Food' }];
    mockedGetSavingsSuggestions.mockResolvedValue(suggestions as never);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mockedGetSavingsSuggestions).toHaveBeenCalledWith(BigInt(7));
    expect(await response.json()).toEqual({
      responseCode: 200, responseStatus: 'SUCCESS', responseMessage: 'Saran penghematan berhasil dibuat', responseDetails: suggestions,
    });
  });

  it('returns the standard server-error envelope when generation fails', async () => {
    mockedGetCurrentUserId.mockResolvedValue(BigInt(7));
    mockedGetSavingsSuggestions.mockRejectedValue(new Error('database unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      responseCode: 500, responseStatus: 'ERROR', responseMessage: 'Internal server error', responseDetails: null,
    });
  });

  it('keeps savings suggestion failures private', async () => {
    mockedGetCurrentUserId.mockResolvedValue(BigInt(7));
    mockedGetSavingsSuggestions.mockRejectedValue(new Error('private savings data'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await GET();
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith('Error generating savings suggestions:', { code: 'UNCLASSIFIED' });
    expect(log.mock.calls.flat().join(' ')).not.toContain('private savings data');
    log.mockRestore();
  });
});
